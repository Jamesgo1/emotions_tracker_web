const express = require("express");
const myrouter = express.Router();
const controller = require("./../controllers/emotionscontrollers")

myrouter.get("/", controller.getHome);
myrouter.get("/emotion/:emotion", controller.getEmotionInfo);

module.exports = myrouter;