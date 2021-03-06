import React, { useEffect, useState } from "react";
import Modal from "../Modal";
import SurveyListItem from "./SurveyListItem";
import { useSelector, useDispatch } from "react-redux";
import { FETCH_SURVEYS } from "../../actions/types";
import { fetchSurveys } from "../../actions/index";

const SurveyList = () => {
	const dispatch = useDispatch();
	const surveys = useSelector((state) => state.surveys);

	const [isOpen, setIsOpen] = useState(false);
	const [selectedSurvey, setSelectedSurvey] = useState(null);
	const [sorting, setSorting] = useState("asc");
	const [filter, setFilter] = useState("sent-draft");

	const showModal = (id) => {
		setIsOpen(true);
		setSelectedSurvey(id);
	};

	const hideModal = () => {
		setIsOpen(false);
	};

	useEffect(() => {
		dispatch(fetchSurveys());
	}, []);

	const renderFilterSelection = () => {
		return (
			<div>
				<select
					className="browser-default"
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
				>
					<option value="sent-draft">All surveys</option>
					<option value="sent">Sent surveys</option>
					<option value="draft">Draft surveys</option>
				</select>
			</div>
		);
	};
	const renderOrderByDateButton = () => {
		return (
			<div
				style={{
					display: "flex",
					justifyContent: "center",
					alignItems: "center",
					height: "50px",
				}}
			>
				<button
					className="btn center"
					onClick={() => {
						sorting === "asc" ? setSorting("desc") : setSorting("asc");
					}}
				>
					Order by Date
					<i className="material-icons">
						{sorting === "asc" ? "arrow_upward" : "arrow_downward"}
					</i>
				</button>
			</div>
		);
	};

	const renderSurveys = () => {
		//Order By Date

		const surveyArray = surveys;

		if (sorting === "desc") {
			surveyArray.sort((a, b) => {
				return new Date(b.dateSent) - new Date(a.dateSent);
			});
		} else {
			surveyArray.sort((a, b) => {
				return new Date(a.dateSent) - new Date(b.dateSent);
			});
		}

		return surveyArray
			.filter((survey) => filter.includes(survey.state))
			.map((survey) => {
				return (
					<SurveyListItem
						key={survey._id}
						_id={survey._id}
						state={survey.state}
						title={survey.title}
						dateSent={survey.dateSent}
						body={survey.body}
						yes={survey.yes}
						no={survey.no}
						filter={filter}
						showModal={showModal}
					/>
				);
			});
	};

	return (
		<main>
			{renderFilterSelection()}
			{renderOrderByDateButton()}
			<Modal
				open={isOpen}
				onClose={hideModal}
				handleConfirm={`/api/delete_survey/${selectedSurvey}`}
			>
				<h1>Delete Survey</h1>
				<p>Are you sure you want to delete this survey?</p>
			</Modal>
			{renderSurveys()}
		</main>
	);
};

/*
const mapStateToProps = ({ surveys }) => {
	return { surveys };
};

export default connect(mapStateToProps, { fetchSurveys })(SurveyList);
*/

export default SurveyList;
