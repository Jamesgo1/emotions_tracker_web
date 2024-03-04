const axios = require("axios");

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

exports.getHome = async (req, res) => {
    const {isloggedin, userid} = req.session;
    console.log(`Logged in: ${isloggedin}`)
    cached_emotions_colors_arrays = await get_emotions_colors_array();

    console.log(cached_emotions_colors_arrays);
    emotion_data = {emotion_name: ""};
    res.render("index", {
        emotion_info: emotion_data,
        emotion_array: cached_emotions_colors_arrays,
        loggedIn: isloggedin
    });
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
    if (!cached_emotions_colors_arrays) {
        cached_emotions_colors_arrays = await get_emotions_colors_array();
    }
    var emotion_color;
    console.log("__EMOTION___")
    console.log(emotion_data);
    cached_emotions_colors_arrays.forEach((emotion_color_array) => {
        if (emotion_color_array[0] == emotion_data.emotion_name) {
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
    const {isloggedin, userid} = req.session;
    cached_emotions_colors_arrays = await get_emotions_colors_array();
    const emotion_score_options = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    emotion_data = {emotion_name: ""};
    res.render("submit_emotions", {
        emotion_info: emotion_data,
        emotion_array: cached_emotions_colors_arrays,
        emotion_score_opts: emotion_score_options,
        loggedIn: isloggedin
    });
    console.log(req.body);
};

exports.getLogin = async (req, res) => {
    const {isloggedin, userid} = req.session;
    cached_emotions_colors_arrays = await get_emotions_colors_array();
    console.log(cached_emotions_colors_arrays);
    emotion_data = {emotion_name: ""};
    res.render("login", {emotion_info: emotion_data, emotion_array: cached_emotions_colors_arrays, loggedIn: isloggedin})
};

exports.postLogin = async (req, res) => {
    const vals = {username, userpass} = req.body;
    console.log(vals);
    const endpoint = `http://localhost:3002/emotions/users`;
    await axios
        .post(endpoint, vals, {
            validateStatus: (status) => {
                return status < 500
            }
        })
        .then((response) => {
            const status = response.status;
            if (status === 200) {
                const data = response.data.result;
                console.log(data);

                const session = req.session;
                session.isloggedin = true;
                console.log(data);
                session.userid = data[0].user_id;
                console.log(session);
                res.redirect('/');
            } else {
                const data = response.data;
                console.log(data);

                res.redirect("/");
            }
        })
        .catch((error) => {
            console.log(`Error making API response: ${error}`);
        });
    console.log("finally")
    console.log(req.session);
};

exports.getEmotionsSubmitted = async (req, res) => {
    cached_emotions_colors_arrays = await get_emotions_colors_array();
    emotion_data = {emotion_name: ""};
    // console.log("Req:");
    // const vals = {heres_a_name} = req.body;
    // console.log(req.body);
    // console.log(req.body);
    res.render("submitted", {emotion_info: emotion_data, emotion_array: cached_emotions_colors_arrays});
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

exports.getInsight = (res, req) => {
    res.render("insight");
}