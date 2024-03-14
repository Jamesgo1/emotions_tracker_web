const axios = require("axios");

async function get_emotions_colors_array() {
    var emotions_colors_arrays;
    endpoint = 'http://localhost:3002/emotions'
    await axios
        .get(endpoint)
        .then((response) => {
            const data = response.data.result;
            let emotion_names = data.map(a => a.emotion_name);
            let bulma_colors = [
                "danger",
                "link",
                "success",
                "primary",
                "warning",
                "info",
                "light"
            ]
            emotions_colors_arrays = emotion_names.map((e, index_n) => {
                return [e, bulma_colors[index_n]];
            });
            cached_emotions_colors_arrays = emotions_colors_arrays;
        })
        .catch((error) => {
            console.log(`Error making API request: ${error}`)
        });
    return emotions_colors_arrays;
}

async function getDefaultHeaderData(req) {
    const {isloggedin} = req.session;
    emotion_data = {emotion_name: ""};
    const emotionArray = await get_emotions_colors_array();
    return {
        emotion_info: emotion_data,
        emotion_array: emotionArray,
        loggedIn: isloggedin
    }
}

async function getSubmittedDataCount(userID) {
    console.log("My user_id")
    console.log(userID);

    var totalSubmissions = [];
    const submissionCountEndpoint = `http://localhost:3002/emotions/sub-count/${userID}`
    await axios
        .get(submissionCountEndpoint, {
            validateStatus: (status) => {
                return status < 500
            }
        })
        .then((response) => {
            console.log(response.data);
            if (response.status === 200) {
                totalSubmissions = response.data.result;
                console.log(totalSubmissions)
            }

        })
        .catch((error) => {
            console.log(`Error making API request: ${error}`)
            result = {"status": 500, "message": `Error making API request: ${error}`}
        });
    return totalSubmissions;

}

async function getUserEmotionSubmissions(userid) {
    const emotionScoresEndpoint = `http://localhost:3002/emotions/submissions/${userid}`;
    var scoresData;
    await axios
        .get(emotionScoresEndpoint)
        .then(async (response) => {
            var emotionScoresData = response.data.result;
            console.log("Emotion scores:")
            emotionScoresData = emotionScoresData.slice(2).at(0);
            console.log(emotionScoresData)
            scoresData = emotionScoresData;

        })
        .catch((error) => {
            console.log(`Error making API request: ${error}`)
            result = {"status": 500, "message": `Error making API request: ${error}`}
        });
    return scoresData;
}

async function getCommonTriggers(userid) {
    var commonTriggers = [];
    const editTriggersEndpoint = `http://localhost:3002/emotions/trigger-count/${userid}`;
    await axios
        .get(editTriggersEndpoint)
        .then(async (response) => {
            console.log(response.data);
            const allTriggers = response.data.result;
            if (allTriggers.length > 0) {
                commonTriggers = allTriggers.slice(0, 5);
            }
        })
        .catch((error) => {
            console.log(`Error making API request: ${error}`)
            result = {"status": 500, "message": `Error making API request: ${error}`}
        });
    return commonTriggers;
}

async function processSubmissionData(req, emotion_submissions, userid) {
    const dataParams = await getDefaultHeaderData(req);

    const orig_emotion_array = dataParams.emotion_array;

    // Initialising new data objects
    const subDates = [];
    const scoresObj = {};

    // Creating keys and arrays for emotion scores
    orig_emotion_array.forEach((emotion_color) => {
        var emotion_name = emotion_color[0];
        scoresObj[emotion_name] = []
    });
    console.log(scoresObj);

    // Looping through submissions data and restructuring for rendering
    emotion_submissions.forEach((score) => {
        // Formatting dates for labels
        var submissionDateTime = score.submission_datetime;
        submissionDateTime = new Date(submissionDateTime);
        const dateformat = {
            year: 'numeric', month: 'numeric',
            day: 'numeric'
        };
        submissionDateTime = new Intl.DateTimeFormat('en-GB', dateformat).format(submissionDateTime);
        subDates.push(submissionDateTime)
        var emotion_vals = score.emotion_scores;
        // Adding scores
        Object.entries(emotion_vals).forEach(([emotion_name, emotion_score]) => {
            console.log(emotion_name)
            var scoresArray = scoresObj[emotion_name];
            scoresArray.push(emotion_score)
        });

    });

    var scoresArrays = [];
    var scoresAverageArray = [];
    var emotionsArray = [];
    Object.entries(scoresObj).forEach(([emotion_name, emotion_score_array]) => {
        scoresArrays.push(emotion_score_array);
        const average = arr => arr.reduce((p, c) => p + c, 0) / arr.length;
        const average_val = average(emotion_score_array);
        console.log(average_val);
        scoresAverageArray.push([average_val]);
        capEmotion = emotion_name.charAt(0).toUpperCase() + emotion_name.substr(1).toLowerCase();
        emotionsArray.push(capEmotion);
    });
    console.log(subDates);
    console.log(scoresObj);
    console.log(dataParams);
    dataParams["date_labels"] = subDates;
    dataParams["scores_data"] = scoresObj;
    dataParams["triggers_filter"] = await getCommonTriggers(userid);
    dataParams["scores_arrays"] = scoresArrays;
    dataParams["scores_ave_array"] = scoresAverageArray;
    dataParams["insight_emotions_array"] = emotionsArray;
    console.log("Insight emotion array:")
    console.log(emotionsArray)
    console.log(scoresAverageArray);
    return dataParams;
}

module.exports = {
    get_emotions_colors_array,
    getSubmittedDataCount,
    getUserEmotionSubmissions,
    getCommonTriggers,
    processSubmissionData,
    getDefaultHeaderData
};