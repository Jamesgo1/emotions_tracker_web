const express = require("express");
const myrouter = express.Router();
const controller = require("./../controllers/emotionscontrollers")

myrouter.get("/", controller.getHome);
myrouter.get("/emotion/:emotion", controller.getEmotionInfo);
myrouter.get("/submit", controller.getSubmissionPage);
myrouter.get("/submitted", controller.getEmotionsSubmitted);
myrouter.get("/login", controller.getLogin)

myrouter.post("/submit", controller.postNewEmotionScore);
myrouter.post("/login", controller.postLogin)
module.exports = myrouter;