const axios = require("axios");
const {response} = require("express");

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
    if (!cached_emotions_colors_arrays) {
        cached_emotions_colors_arrays = await get_emotions_colors_array();
    }
    console.log(cached_emotions_colors_arrays);
    emotion_data = {emotion_name: ""};
    res.render("index", {emotion_info: emotion_data, emotion_array: cached_emotions_colors_arrays});
};

exports.getEmotionInfo = async (req, res) => {
    console.log(req.params);
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
        if(emotion_color_array[0] == emotion_data.emotion_name){
            emotion_color = emotion_color_array[1];
        }
    })
    console.log(emotion_color);
    res.render("emotion_info", {
        emotion_info: emotion_data,
        emotion_array: cached_emotions_colors_arrays,
        current_emotion_color: emotion_color
    });
};

exports.getLogin = (req, res) => {
    res.render("login");
};

exports.postResults = (req, res) => {
    res.render("submitted");
}

exports.getInsight = (res, req) => {
    res.render("insight");
}