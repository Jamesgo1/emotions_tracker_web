const express = require("express");
const dotenv = require("dotenv").config({path: "./config.env"});
const morgan = require("morgan");
const path = require("path");
const session = require("express-session");
const router = require("./routes/myroutes");
const helmet = require("helmet");



const app = express();

app.use(express.static(path.join(__dirname, "/public")));
app.use(morgan("tiny"));
app.use(express.urlencoded({extended: true}));

app.use(session({
    secret: "mysecretstring1234",
    resave: false,
    saveUninitialized: false
}));

app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            "script-src": ["'self'", "cdn.jsdelivr.net", "cdnjs.cloudflare.com", "'unsafe-inline'"],
            "img-src": ["'self'", "cdn2.thecatapi.com"]
        }
    }
}));

app.use("/", router);
app.set("view engine", "ejs");

app.get('*', (req, res) =>{
    res.render("404")
});

app.listen(process.env.PORT, (err) => {
    if (err) return console.log(err);
    console.log(`Express listening on port ${process.env.PORT}!`)
})
