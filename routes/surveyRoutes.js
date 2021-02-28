const _ = require("lodash");
const { Path } = require("path-parser");
const { URL } = require("url");

const mongoose = require("mongoose");
const requireLogin = require("../middlewares/requireLogin");
const requireCredits = require("../middlewares/requireCredits");
const Mailer = require("../services/Mailer");
const surveyTemplate = require("../services/emailTemplates/surveyTemplate");
const { response } = require("express");
const { filter } = require("lodash");

//we got the Class
const Survey = mongoose.model("surveys");

module.exports = (app) => {
	app.all("/api/delete_survey/:surveyId", requireLogin, async (req, res) => {
		const surveyId = req.param("surveyId");
		await Survey.findByIdAndRemove(surveyId, () => {
			console.log("deleted");
		}).catch((error) => console.log(error));
		res.redirect("/surveys");
	});

	app.get("/api/surveys", requireLogin, async (req, res) => {
		const surveys = await Survey.find({ _user: req.user.id }).select({
			recipients: false,
		});

		res.send(surveys);
	});

	app.get("/api/surveys/:surveyId/:choice", (req, res) => {
		res.send("Thanks for voting");
	});

	app.post("/api/surveys/webhooks", (req, res) => {
		const p = new Path("/api/surveys/:surveyId/:choice");

		_.chain(req.body)
			.map(({ email, url }) => {
				//return null if cant extract these from url
				const match = p.test(new URL(url).pathname);
				if (match) {
					return { email, surveyId: match.surveyId, choice: match.choice };
				}
			})
			//remove undefined elements
			.compact()
			.uniqBy("email", "surveyId")
			.each(({ surveyId, email, choice }) => {
				Survey.updateOne(
					{
						_id: surveyId,
						recipients: {
							$elemMatch: { email: email, responded: false },
						},
					},
					{
						$inc: { [choice]: 1 },
						$set: { "recipients.$.responded": true },
						lastResponded: new Date(),
					}
				).exec();
			})
			.value();

		res.send({});
	});

	app.get("/api/save_as_draft", requireLogin, async (req, res) => {
		const { title, subject, body, recipients } = req.body;
		const survey = new Survey({
			title,
			subject,
			body,
			recipients: recipients
				.split(",")
				.map((email) => ({ email: email.trim() })),
			_user: req.user.id,
		});

		await survey.save();
		res.redirect("/surveys");
	});

	app.get(
		"/api/send_survey/:surveyId",
		requireLogin,
		requireCredits,
		async (req, res) => {
			const surveyId = req.param("surveyId");
			const filter = { _id: surveyId };
			const update = { state: "sent", dateSent: Date.now() };
			const response = await Survey.findOneAndUpdate(filter, update);

			//attempt to Send
			const mailer = new Mailer(response, surveyTemplate(response));

			try {
				await mailer.send();
				req.user.credits -= 1;
				const user = await req.user.save();
				res.send(user);
			} catch (err) {
				res.status(422).send(err);
			}
		}
	);

	app.post("/api/surveys", requireLogin, requireCredits, async (req, res) => {
		const { title, subject, body, recipients } = req.body;

		const survey = new Survey({
			title,
			subject,
			body,
			recipients: recipients
				.split(",")
				.map((email) => ({ email: email.trim() })),
			_user: req.user.id,
			state: "sent",
			dateSent: Date.now(),
		});

		//attempt to Send
		const mailer = new Mailer(survey, surveyTemplate(survey));

		try {
			await mailer.send();
			await survey.save();
			req.user.credits -= 1;
			const user = await req.user.save();
			res.send(user);
		} catch (err) {
			res.status(422).send(err);
		}
	});
};
