const express = require("express");
const dotenv = require("dotenv").config({path: "./config.env"});
const morgan = require("morgan");
const path = require("path");
const router = require("./routes/myroutes")

const app = express();

app.use(morgan("tiny"));
app.use(express.static(path.join(__dirname, "/public")));
app.use("/", router);
app.set("view engine", "ejs");

app.listen(process.env.PORT, (err) => {
    if (err) return console.log(err);
    console.log(`Express listening on port ${process.env.PORT}!`)
})
