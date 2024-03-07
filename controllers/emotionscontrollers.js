const axios = require("axios");
const bcrypt = require("bcrypt");

var cached_emotions_colors_arrays;

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
    const {isloggedin, userid} = req.session;
    emotion_data = {emotion_name: ""};
    cached_emotions_colors_arrays = await get_emotions_colors_array();
    return {
        emotion_info: emotion_data,
        emotion_array: cached_emotions_colors_arrays,
        loggedIn: isloggedin
    }
}

exports.getHome = async (req, res) => {
    headerParams = await getDefaultHeaderData(req)
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

    cached_emotions_colors_arrays = await get_emotions_colors_array();
    var emotion_color;
    console.log("__EMOTION___")
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
    var defaultParams = await getDefaultHeaderData(req);
    if (defaultParams.loggedIn) {
        defaultParams["emotion_score_opts"] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
        res.render("submit_emotions", defaultParams);
        console.log(req.body);
    } else {
        res.redirect("/");
    }

};

exports.getLogin = async (req, res) => {
    var defaultParams = await getDefaultHeaderData(req)
    defaultParams["status_code"] = 0;
    res.render("login", defaultParams);
};

exports.postLogin = async (req, res) => {
    var dataParams;
    const vals = {username, password} = req.body;
    console.log(vals);
    const endpoint = `http://localhost:3002/emotions/users`;
    await axios
        .post(endpoint, vals, {
            validateStatus: (status) => {
                return status < 500
            }
        })
        .then(async (response) => {
            const status = response.status;
            // console.log(response);
            console.log(status);
            if (status === 200) {
                const data = response.data;
                console.log(data);

                const session = req.session;
                session.isloggedin = true;
                console.log(data);
                session.userid = data.user_id;
                console.log(session);
                res.redirect('/');
            } else if (status === 429) {
                dataParams = await getDefaultHeaderData(req);
                dataParams["status_code"] = status;
                emotion_data = {emotion_name: ""};
                res.render("login", dataParams);

            } else {
                const data = response.data;
                dataParams = await getDefaultHeaderData(req);
                dataParams["status_code"] = status;
                res.render("login", dataParams);
            }
        })
        .catch((error) => {
            console.log(`Error making API response: ${error}`);
        });
};

exports.getEmotionsSubmitted = async (req, res) => {
    var dataParmas = await getDefaultHeaderData(req);
    res.render("submitted", dataParmas);
}

exports.postNewEmotionScore = async (req, res) => {
    var valsToPost = {
        anger_score, contempt_score, disgust_score, enjoyment_score, fear_score, sadness_score, surprise_score, triggers
    } = req.body;

    var triggers_array = triggers.split(/[\r\n]+/gm)

    // Converting to integers
    Object.keys(valsToPost).forEach(key => {
        valsToPost[key] = parseInt(valsToPost[key]);
    });

    delete valsToPost.triggers;
    valsToPost["triggers_array"] = triggers_array;
    submission_date = new Date().toLocaleString();
    valsToPost["sub_date_time"] = submission_date;
    // console.log(trigger_array);
    console.log(valsToPost);


    console.log(submission_date);
};

exports.getLogout = async (req, res) => {
    var dataParams = await getDefaultHeaderData(req);
    res.render("logout", dataParams);
}

exports.postLogout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
};

async function checkRegCredentialsAvailable(usernameCheck, emailCheck) {
    reqVals = {
        username: usernameCheck,
        email: emailCheck
    }
    var result;
    console.log(reqVals);
    const endpoint = `http://localhost:3002/emotions/users/reg-check`;
    await axios
        .post(endpoint, reqVals, {
            validateStatus: (status) => {
                return status < 500
            }
        })
        .then((response) => {
            result = response;
            return result;
        })
        .catch((error) => {
            console.log(`Error making API request: ${error}`)
            result = {"status": 500, "message": `Error making API request: ${error}`}
        });
    return result;
}

exports.getRegister = async (req, res) => {
    var dataParams = await getDefaultHeaderData(req);
    dataParams["status_code"] = 0;
    res.render("register", dataParams);
};

exports.postRegister = async (req, res) => {
    const allRegisterVals = {username, password, password2, first_name, last_name, postcode, country, email} = req.body;
    const valsToRegister = {username, password, first_name, last_name, postcode, country, email}

    credAvailableResult = await checkRegCredentialsAvailable(username, email);
    var dataParams;

    if (credAvailableResult.status === 200) {
        const endpoint = `http://localhost:3002/emotions/users/add-user-details`;
        await axios
            .post(endpoint, valsToRegister)
            .then(async (response) => {
                if (response.status === 200) {

                    const session = req.session;
                    session.isloggedin = true;
                    session.userid = response.data.user_id;
                    res.redirect('/');
                } else {
                    dataParams = await getDefaultHeaderData(req);
                    dataParams["status_code"] = response.status;
                    res.render("register", dataParams);
                }

            })
            .catch((error) => {
                console.log(`Error making API request: ${error}`)
            });

    } else {
        dataParams = await getDefaultHeaderData(req);
        dataParams["status_code"] = credAvailableResult.status;
        res.render("register", dataParams);
    }
};

exports.getAbout = async (req, res) => {
    const dataParams = await getDefaultHeaderData(req);
    res.render("about", dataParams);
}
exports.getInsight = (req, res) => {
    res.render("insight");
};