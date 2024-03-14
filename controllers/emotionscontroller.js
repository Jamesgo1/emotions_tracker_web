const axios = require("axios");

const {add} = require("nodemon/lib/rules");
const efuncs = require("./controller_funcs/emotionfunctions");
const ufuncs = require("./controller_funcs/userfunctions");
const apifuncs = require("./controller_funcs/externalapifunctions");


exports.getHome = async (req, res) => {
    const headerParams = await efuncs.getDefaultHeaderData(req);
    var submissionCount = 0;
    isLoggedIn = headerParams.loggedIn;
    if (isLoggedIn) {
        const {userid} = req.session;
        submissionCount = await efuncs.getSubmittedDataCount(userid);
        if (submissionCount.length > 0) {
            submissionCount = submissionCount.at(0).total;
        }
    }
    console.log(submissionCount);
    headerParams["sub_count"] = submissionCount;
    res.render("index", headerParams);
};


exports.getEmotionInfo = async (req, res) => {
    console.log(req.params);
    const {isloggedin, userid} = req.session;
    emotion_name = req.params.emotion;
    endpoint = `http://localhost:3002/emotions/${emotion_name}`;

    await axios
        .get(endpoint)
        .then((response) => {
            const data = response.data.result;
            emotion_data = data[0];
            console.log(emotion_data);
        })
        .catch((error) => {
            console.log(`Error making API request: ${error}`)
        });

    cached_emotions_colors_arrays = await efuncs.get_emotions_colors_array();
    var emotion_color;
    console.log("Emotion selected:")
    console.log(emotion_data);
    cached_emotions_colors_arrays.forEach((emotion_color_array) => {
        if (emotion_color_array[0] === emotion_data.emotion_name) {
            emotion_color = emotion_color_array[1];
        }
    })
    console.log(emotion_color);
    res.render("emotion_info", {
        emotion_info: emotion_data,
        emotion_array: cached_emotions_colors_arrays,
        current_emotion_color: emotion_color,
        loggedIn: isloggedin
    });
};

exports.getSubmissionPage = async (req, res) => {
    var defaultParams = await efuncs.getDefaultHeaderData(req);

    if (defaultParams.loggedIn) {
        const {userid} = req.session;
        const submittedTodayCount = await ufuncs.checkIfAlreadySubmitted(userid);
        console.log("Submissions today count:")
        console.log(submittedTodayCount);
        if (submittedTodayCount > 0) {
            res.render("already_submitted", defaultParams);
        } else {
            defaultParams["emotion_score_opts"] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            res.render("submit_emotions", defaultParams);
        }
    } else {
        res.redirect("/");
    }

};


exports.postNewEmotionScore = async (req, res) => {
    var valsToPost = {
        anger_score, contempt_score, disgust_score, enjoyment_score, fear_score, sadness_score, surprise_score, triggers
    } = req.body;

    triggers = triggers.replace(",", " ");

    var triggers_array = triggers.split(/[\r\n]+/gm)

    // Adding user_id for session
    const {userid} = req.session;
    valsToPost["user_id"] = userid;

    // Converting to integers
    Object.keys(valsToPost).forEach(key => {
        valsToPost[key] = parseInt(valsToPost[key]);
    });

    delete valsToPost.triggers;
    valsToPost["triggers_array"] = triggers_array;

    // console.log(trigger_array);
    console.log(valsToPost);

    const submissionEndpoint = "http://localhost:3002/emotions/submit";
    await axios
        .post(submissionEndpoint, valsToPost, {
            validateStatus: (status) => {
                return status < 500
            }
        })
        .then(async (response) => {
            console.log(response.data);
            var submissionCount = await efuncs.getSubmittedDataCount(userid);
            if (submissionCount.length > 0) {
                submissionCount = submissionCount.at(0).total;
            }
            const dataParams = await efuncs.getDefaultHeaderData(req);
            dataParams["sub_count"] = submissionCount;
            console.log(dataParams);
            dataParams["cat_url"] = await apifuncs.getCatPic();
            res.render("submitted", dataParams);

        })
        .catch((error) => {
            console.log(`Error making API request: ${error}`)
            result = {"status": 500, "message": `Error making API request: ${error}`}
        });
};


exports.getEmotionInputs = async (req, res) => {
    const {isloggedin, userid} = req.session;
    console.log(`My user id:`)
    console.log(userid);
    if (isloggedin) {
        const scoresData = await efuncs.getUserEmotionSubmissions(userid);
        if (scoresData) {
            const dataParams = await efuncs.getDefaultHeaderData(req);
            dataParams["emotion_scores"] = scoresData;
            res.render("view_submissions", dataParams);
        } else {
            res.redirect("/");
        }
    } else {
        res.redirect("/");
    }


};

exports.getDeleteSubmission = async (req, res) => {
    const {isloggedin} = req.session;
    console.log(req.params);
    if (isloggedin) {
        var dataParams = await efuncs.getDefaultHeaderData(req);
        dataParams["sub_id"] = req.params.submissionid;
        res.render("delete_submission", dataParams);
    } else {
        res.redirect("/");
    }

};

exports.postDeleteSubmission = async (req, res) => {
    console.log(req.body);
    const {sub_id} = req.body
    console.log("post sub_id")
    console.log(sub_id);


    const deletionEndpoint = `http://localhost:3002/emotions/del-submission/${sub_id}`;
    await axios
        .delete(deletionEndpoint)
        .then((response) => {
            console.log(response.data);
            res.redirect("/");
        })
        .catch((error) => {
            console.log(`Error making API request: ${error}`)
            result = {"status": 500, "message": `Error making API request: ${error}`}
        });

};


exports.getEditTriggers = async (req, res) => {
    const {isloggedin, userid} = req.session;
    console.log(req.params);
    if (isloggedin) {
        const sub_id = req.params.submissionid
        session.subid = sub_id;
        const editTriggersEndpoint = `http://localhost:3002/emotions/triggers/${sub_id}`
        await axios
            .get(editTriggersEndpoint)
            .then(async (response) => {
                console.log(response.data);
                const dataParams = await efuncs.getDefaultHeaderData(req);
                dataParams["triggers"] = response.data.result;
                res.render("edit_triggers", dataParams);

            })
            .catch((error) => {
                console.log(`Error making API request: ${error}`)
                result = {"status": 500, "message": `Error making API request: ${error}`}
            });
    } else {
        res.redirect("/");
    }
};


exports.updateTriggers = async (req, res) => {
    console.log(req.body);
    const triggerOuptut = req.body;
    const triggersToDelete = [];
    Object.entries(triggerOuptut).forEach(([outputLabel, outputValue]) => {
        if (outputLabel !== "triggers" && outputValue === "on") {
            triggersToDelete.push(outputLabel);
        }
    });
    if (triggersToDelete.length > 0) {
        const triggerUpdateEndpoint = "http://localhost:3002/emotions/trigger-delete";
        await axios
            .post(triggerUpdateEndpoint, triggersToDelete)
            .then((response) => {
                console.log(response.data);
            })
            .catch((error) => {
                console.log(`Error making API request: ${error}`)
                result = {"status": 500, "message": `Error making API request: ${error}`}
            });
    }
    if (triggerOuptut.triggers) {
        triggers = triggers.replace(",", " ");
        const triggers_array = triggers.split(/[\r\n]+/gm);
        triggers_array.push(session.subid);
        const triggerUpdateEndpoint = "http://localhost:3002/emotions/trigger-delete";
        await axios
            .post(triggerUpdateEndpoint, triggersToDelete)
            .then((response) => {
                console.log(response.data);
            })
            .catch((error) => {
                console.log(`Error making API request: ${error}`)
                result = {"status": 500, "message": `Error making API request: ${error}`}
            });
    }


};


exports.getAbout = async (req, res) => {
    const dataParams = await efuncs.getDefaultHeaderData(req);
    res.render("about", dataParams);
};


exports.getInsight = async (req, res) => {
    // Getting required data
    const {isloggedin, userid} = req.session;

    if (isloggedin) {
        const emotion_submissions = await efuncs.getUserEmotionSubmissions(userid);
        const dataParams = await efuncs.processSubmissionData(req, emotion_submissions, userid);
        dataParams["filtered_triggers"] = {};
        res.render("insight", dataParams);
    } else {
        res.redirect("/");
    }
};

exports.postInsightFilter = async (req, res) => {
    const {isloggedin, userid} = req.session;
    if (isloggedin) {


        const insightFilters = req.body;

        const triggerArray = [];
        Object.entries(insightFilters).forEach(([triggerName, triggerStatus]) => {
            if (triggerStatus === "on") {
                triggerArray.push(triggerName)
            }
        });
        const emotionSubmissions = await efuncs.getUserEmotionSubmissions(userid);

        const filteredSubmissions = [];
        emotionSubmissions.forEach((emotionSubObject) => {
            var triggerFound = false;
            triggerArray.forEach((trigger) => {
                if (emotionSubObject.triggers.includes(trigger)) {
                    triggerFound = true;
                }
            });
            if (triggerFound) {
                filteredSubmissions.push(emotionSubObject);
            }
        });
        const dataParams = await efuncs.processSubmissionData(req, emotionSubmissions, userid);
        dataParams["filtered_triggers"] = await efuncs.processSubmissionData(req, filteredSubmissions, userid);
        console.log("Total scores ave array:")
        console.log(dataParams["scores_ave_array"]);
        console.log("Filtered ave scores array:")
        console.log(dataParams["filtered_triggers"]["scores_ave_array"]);
        console.log(Object.keys(dataParams["filtered_triggers"]).length);
        console.log("\nScore ave array:")
        console.log(dataParams["filtered_triggers"].scores_ave_array)

        console.log("\nFiltered triggers score ave array:")
        console.log(dataParams.filtered_triggers);
        res.render("insight", dataParams);
        // emotionSubmissions.forEach((sub) => {
        //
        // });

    } else {
        res.redirect("/");
    }


};