const axios = require("axios");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const {add} = require("nodemon/lib/rules");

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

async function encryptPII(stringToEncrypt) {
    const algorithm = 'aes-256-ctr';
    const ENCRYPTION_KEY = process.env.ENCRYPT_KEY
    resizedEncryptionKey = Buffer.concat([Buffer.from(ENCRYPTION_KEY), Buffer.alloc(32)], 32);
    const IV_LENGTH = 16;

    let iv = crypto.randomBytes(IV_LENGTH);
    let cipher = crypto.createCipheriv(algorithm, resizedEncryptionKey, iv);
    let encrypted = cipher.update(stringToEncrypt);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');

}

async function decryptPII(objectToDecrypt) {
    const algorithm = 'aes-256-ctr';
    const ENCRYPTION_KEY = process.env.ENCRYPT_KEY
    resizedEncryptionKey = Buffer.concat([Buffer.from(ENCRYPTION_KEY), Buffer.alloc(32)], 32);

    let textParts = objectToDecrypt.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv(algorithm, resizedEncryptionKey, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

async function addToLoginHist(successInd, userID) {

    const loginHistEndpoint = 'http://localhost:3002/emotions/users/add-login-hist';

    await axios
        .post(loginHistEndpoint, {"success_ind": successInd, "user_id": userID})
        .then((response) => {
            console.log(response.data);
        })
        .catch((error) => {
            console.log(`Error making API response: ${error}`);
        });
}

async function getLoginAttempts(userID) {
    console.log(`Input user ID: ${userID}`);

    const loginAttemptsEndpoint = `http://localhost:3002/emotions/users/login-attempts/${userID}`
    var outputResponse;
    await axios
        .get(loginAttemptsEndpoint, {
            validateStatus: (status) => {
                return status < 500
            }
        })
        .then((response) => {
            outputResponse = response;
        })
        .catch((error) => {
            console.log(`Error making API response: ${error}`);
        });
    return outputResponse;
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

    // Return encrypted password if username exists:
    const usernameEndpoint = 'http://localhost:3002/emotions/users/login-check';

    await axios
        .post(usernameEndpoint, {username}, {
            validateStatus: (status) => {
                return status < 500
            }
        })
        .then(async (response) => {
            const usernameStatus = response.status;
            console.log("Here's the username status:")
            console.log(usernameStatus);
            if (usernameStatus === 200) {
                const returnedVals = response.data.data.output_data;
                const dbPassword = returnedVals.password;
                const dbuserid = returnedVals.user_id;
                const decryptedPW = await decryptPII(dbPassword);
                const totalFailedLogins = await getLoginAttempts(dbuserid);
                if (totalFailedLogins.status !== 200) {
                    await addToLoginHist(-1, dbuserid);
                    dataParams = await getDefaultHeaderData(req);
                    console.log("Too many failed logins status:")
                    console.log(totalFailedLogins.status);
                    dataParams["status_code"] = totalFailedLogins.status;
                    res.render("login", dataParams);
                } else {
                    if (password === decryptedPW) {
                        const session = req.session;
                        session.isloggedin = true;
                        session.userid = dbuserid;
                        await addToLoginHist(1, dbuserid);
                        res.redirect('/');
                    } else {
                        await addToLoginHist(0, dbuserid);
                        dataParams = await getDefaultHeaderData(req);
                        console.log("Incorrect password")
                        console.log(usernameStatus);
                        dataParams["status_code"] = 401;
                        res.render("login", dataParams);
                    }

                }
            } else {
                dataParams = await getDefaultHeaderData(req);
                console.log("No username:")
                console.log(usernameStatus);
                dataParams["status_code"] = usernameStatus;
                res.render("login", dataParams);

            }
        })
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
    dataParams["validation_issues"] = [];
    res.render("register", dataParams);
};

async function permanentHashData(fieldToHash) {
    const saltRounds = 8;
    bcrypt
        .hash(fieldToHash, saltRounds)
        .catch((err) => {
            console.log(`Hasing error: ${err}`);
        })
    return hash;
}


async function validatePassword(pw1, pw2) {
    const passwordStatusArray = [];

    if (pw1 !== pw2) {
        passwordStatusArray.push("The two passwords do not match");
    }
    if (pw1.length < 7) {
        passwordStatusArray.push("The password entered is less than seven characters");
    }
    if (pw1.indexOf(" ") >= 0) {
        passwordStatusArray.push("The password contains spaces");
    }
    console.log(passwordStatusArray);
    return passwordStatusArray;

}

async function validateUsername(inputField) {
    const usernameStatusArray = [];
    if (!inputField.match(/^[0-9a-zA-Z_-]+$/)) {
        usernameStatusArray.push("Username contains characters that are not numbers, letters, dashes, or underscores");
    }
    return usernameStatusArray;

}

async function preprocessInput(jsObject) {
    Object.keys(jsObject).forEach((key) => {
        jsObject[key] = jsObject[key].trim();
    })
    return jsObject;
}


exports.postRegister = async (req, res) => {
    console.log("Encryption:")
    var allRegisterVals = {username, password, password2, first_name, last_name, postcode, country, email} = req.body;

    const invalidStatusArray = [];
    dataParams = await getDefaultHeaderData(req);
    console.log("before:")
    console.log(allRegisterVals)
    allRegisterVals = await preprocessInput(allRegisterVals)
    console.log(allRegisterVals)

    const trimmedVals = {
        username,
        password,
        password2,
        first_name,
        last_name,
        postcode,
        country,
        email
    } = await preprocessInput(allRegisterVals)
    const invalidPasswordStatus = await validatePassword(password, password2);
    console.log(invalidPasswordStatus)
    invalidStatusArray.push(...invalidPasswordStatus);
    const invalidUsernameStatus = await validateUsername(username);
    invalidStatusArray.push(...invalidUsernameStatus);

    if (invalidStatusArray.length > 0) {
        console.log("Invalid statuses:")
        console.log(invalidStatusArray);
        dataParams["validation_issues"] = invalidStatusArray;
        res.render("register", dataParams);
    } else {
        const encryptedFirstName = await encryptPII(first_name);
        const encryptedLastName = await encryptPII(last_name);
        const encryptedPassword = await encryptPII(password);
        const encryptedEmail = await encryptPII(email);
        const valsToRegister = {
            username,
            encryptedPassword,
            encryptedFirstName,
            encryptedLastName,
            postcode,
            country,
            encryptedEmail
        }

        dataParams = await getDefaultHeaderData(req);
        credAvailableResult = await checkRegCredentialsAvailable(username, email);

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

                        dataParams["validation_issues"] = ["Unknown issue with input provided"];
                        res.render("register", dataParams);
                    }

                })
                .catch((error) => {
                    console.log(`Error making API request: ${error}`)
                });

        } else {
            dataParams["validation_issues"] = ["Username and/or email already in use. Please use different" +
            " credentials."];
            res.render("register", dataParams);
        }
    }
};

exports.getAbout = async (req, res) => {
    const dataParams = await getDefaultHeaderData(req);
    res.render("about", dataParams);
}
exports.getInsight = (req, res) => {
    res.render("insight");
};