const express = require("express");
const myrouter = express.Router();
const controller = require("./../controllers/emotionscontrollers")
const {getEditDetails, getDelete} = require("../controllers/emotionscontrollers");

myrouter.get("/", controller.getHome);
myrouter.get("/emotion/:emotion", controller.getEmotionInfo);
myrouter.get("/submit", controller.getSubmissionPage);
myrouter.get("/login", controller.getLogin);
myrouter.get("/logout", controller.getLogout);
myrouter.get("/register", controller.getRegister);
myrouter.get("/about", controller.getAbout);
myrouter.get("/profile", controller.getProfile);
myrouter.get("/edit/:editfield", getEditDetails);
myrouter.get("/delete", getDelete);

myrouter.post("/submit", controller.postNewEmotionScore);
myrouter.post("/login", controller.postLogin);
myrouter.post("/logout", controller.postLogout);
myrouter.post("/register", controller.postRegister);
myrouter.post("/edit/:editfield", controller.updateEditDetails);
module.exports = myrouter;