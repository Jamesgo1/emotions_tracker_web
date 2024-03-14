const express = require("express");
const myrouter = express.Router();
const emotionsController = require("./../controllers/emotionscontroller")
const userController = require("./../controllers/usercontroller")

myrouter.get("/", emotionsController.getHome);
myrouter.get("/emotion/:emotion", emotionsController.getEmotionInfo);
myrouter.get("/submit", emotionsController.getSubmissionPage);
myrouter.get("/login", userController.getLogin);
myrouter.get("/logout", userController.getLogout);
myrouter.get("/register", userController.getRegister);
myrouter.get("/about", emotionsController.getAbout);
myrouter.get("/profile", userController.getProfile);
myrouter.get("/edit/:editfield", userController.getEditDetails);
myrouter.get("/delete", userController.getDelete);
myrouter.get("/submissions", emotionsController.getEmotionInputs);
myrouter.get("/delete-submission/:submissionid", emotionsController.getDeleteSubmission);
myrouter.get("/edit-context/:submissionid", emotionsController.getEditTriggers);
myrouter.get("/insight", emotionsController.getInsight);

myrouter.post("/submit", emotionsController.postNewEmotionScore);
myrouter.post("/login", userController.postLogin);
myrouter.post("/logout", userController.postLogout);
myrouter.post("/register", userController.postRegister);
myrouter.post("/edit/:editfield", userController.updateEditDetails);
myrouter.post("/delete-submission", emotionsController.postDeleteSubmission);
myrouter.post("/delete", userController.postDelete);
myrouter.post("/edit-context", emotionsController.updateTriggers);
myrouter.post("/insight", emotionsController.postInsightFilter);

module.exports = myrouter;