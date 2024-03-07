const express = require("express");
const myrouter = express.Router();
const controller = require("./../controllers/emotionscontrollers")

myrouter.get("/", controller.getHome);
myrouter.get("/emotion/:emotion", controller.getEmotionInfo);
myrouter.get("/submit", controller.getSubmissionPage);
myrouter.get("/submitted", controller.getEmotionsSubmitted);
myrouter.get("/login", controller.getLogin);
myrouter.get("/logout", controller.getLogout);
myrouter.get("/register", controller.getRegister);
myrouter.get("/about", controller.getAbout)

myrouter.post("/submit", controller.postNewEmotionScore);
myrouter.post("/login", controller.postLogin);
myrouter.post("/logout", controller.postLogout);
myrouter.post("/register", controller.postRegister)

module.exports = myrouter;