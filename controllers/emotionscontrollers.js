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
    const {isloggedin} = req.session;
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

async function checkIfAlreadySubmitted(userID) {
    const loginAttemptsEndpoint = `http://localhost:3002/emotions/sub-today/${userID}`
    var submittedTodayCount;
    await axios
        .get(loginAttemptsEndpoint, {
            validateStatus: (status) => {
                return status < 500
            }
        })
        .then((response) => {
            submittedTodayCount = response.data.result;
        })
        .catch((error) => {
            console.log(`Error making API response: ${error}`);
        });
    return submittedTodayCount;
}

async function getCatPic() {
    const catEndpoint = process.env.CAT_API
    var catPicURL = "";
    await axios
        .get(catEndpoint, {
            validateStatus: (status) => {
                return status < 500
            }
        })
        .then((response) => {
            if (response.status === 200) {
                catPicURL = response.data.at(0).url;
            }

        })
        .catch((error) => {
            console.log(`Error making API request: ${error}`)
            result = {"status": 500, "message": `Error making API request: ${error}`}
        });
    return catPicURL;
}

async function getSubmittedData(userID) {
    console.log("My user_id")
    console.log(userID);

    var totalSubmissions = [];
    const submissionCountEndpoint = `http://localhost:3002/emotions/sub-count/${userID}`
    await axios
        .get(submissionCountEndpoint, {
            validateStatus: (status) => {
                return status < 500
            }
        })
        .then((response) => {
            console.log(response.data);
            if (response.status === 200) {
                totalSubmissions = response.data.result;
                console.log(totalSubmissions)
            }

        })
        .catch((error) => {
            console.log(`Error making API request: ${error}`)
            result = {"status": 500, "message": `Error making API request: ${error}`}
        });
    return totalSubmissions;

}

async function checkRegCredentialsAvailable(usernameCheck) {
    reqVals = {
        username: usernameCheck,
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

async function getUserDetails(userID) {
    const endpoint = `http://localhost:3002/emotions/users/user-details/${userID}`;
    var decryptedDetails;

    await axios
        .get(endpoint)
        .then(async (response) => {
            const userDetailsRow = response.data.details.at(0);
            console.log(userDetailsRow);
            const userDetails = {username, password, first_name, last_name, postcode, country, email} = userDetailsRow;
            const decryptedFirstName = await decryptPII(first_name);
            const decryptedLastName = await decryptPII(last_name);
            const decryptedEmail = await decryptPII(email);
            const decryptedPassword = await decryptPII(password);
            const passwordOutput = new Array(decryptedPassword.length + 1).join("*");
            decryptedDetails = {
                "username": username,
                "password": passwordOutput,
                "first_name": decryptedFirstName,
                "last_name": decryptedLastName,
                "postcode": postcode,
                "country": country,
                "email": decryptedEmail
            }

        })
        .catch((error) => {
            console.log(`Error making API request: ${error}`)
            result = {"status": 500, "message": `Error making API request: ${error}`}
        });
    return decryptedDetails;
}

exports.getHome = async (req, res) => {
    const headerParams = await getDefaultHeaderData(req);
    var submissionCount = 0;
    isLoggedIn = headerParams.loggedIn;
    if (isLoggedIn) {
        const {userid} = req.session;
        submissionCount = await getSubmittedData(userid);
        if (submissionCount.length > 0) {
            submissionCount = submissionCount.at(0).total;
        }
    }
    console.log(submissionCount);
    headerParams["sub_count"] = submissionCount;
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
    console.log("Emotion selected:")
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
        const {userid} = req.session;
        const submittedTodayCount = await checkIfAlreadySubmitted(userid);
        console.log("Submissions today count:")
        console.log(submittedTodayCount);
        if (submittedTodayCount > 0) {
            res.render("already_submitted", defaultParams);
        } else {
            defaultParams["emotion_score_opts"] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
            res.render("submit_emotions", defaultParams);
        }
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


exports.postNewEmotionScore = async (req, res) => {
    var valsToPost = {
        anger_score, contempt_score, disgust_score, enjoyment_score, fear_score, sadness_score, surprise_score, triggers
    } = req.body;

    var triggers_array = triggers.split(/[\r\n]+/gm)

    // Adding user_id for session
    const {userid} = req.session;
    valsToPost["user_id"] = userid;

    // Converting to integers
    Object.keys(valsToPost).forEach(key => {
        valsToPost[key] = parseInt(valsToPost[key]);
    });

    delete valsToPost.triggers;
    valsToPost["triggers_array"] = triggers_array;

    // console.log(trigger_array);
    console.log(valsToPost);

    const submissionEndpoint = "http://localhost:3002/emotions/submit";
    await axios
        .post(submissionEndpoint, valsToPost, {
            validateStatus: (status) => {
                return status < 500
            }
        })
        .then(async (response) => {
            console.log(response.data);
            var submissionCount = await getSubmittedData(userid);
            if (submissionCount.length > 0) {
                submissionCount = submissionCount.at(0).total;
            }
            const dataParams = await getDefaultHeaderData(req);
            dataParams["sub_count"] = submissionCount;
            console.log(dataParams);
            dataParams["cat_url"] = await getCatPic();
            res.render("submitted", dataParams);

        })
        .catch((error) => {
            console.log(`Error making API request: ${error}`)
            result = {"status": 500, "message": `Error making API request: ${error}`}
        });
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


exports.getRegister = async (req, res) => {
    var dataParams = await getDefaultHeaderData(req);
    dataParams["status_code"] = 0;
    dataParams["validation_issues"] = [];
    res.render("register", dataParams);
};


exports.getProfile = async (req, res) => {
    // A place for the user to view, edit and delete their information
    const {userid, isloggedin} = req.session;
    if (isloggedin) {
        const decryptedDetails = await getUserDetails(userid);
        const dataParams = await getDefaultHeaderData(req);
        dataParams["user_details"] = decryptedDetails;
        res.render("profile", dataParams);
    } else {
        res.redirect("/");
    }

}

exports.getEditDetails = async (req, res) => {
    // The page where user can edit their details
    const {isloggedin, userid} = req.session;
    if (isloggedin) {
        const edit_field = req.params.editfield;
        console.log("Edit details:")
        console.log(req.params);
        const userDetails = await getUserDetails(userid);
        const dataParams = await getDefaultHeaderData(req);
        dataParams["field_label"] = edit_field;
        dataParams["field_value"] = userDetails[edit_field];
        dataParams["validation_issues"] = [];

        res.render("user_edit", dataParams);
    } else {
        res.redirect("/");
    }

}

exports.updateEditDetails = async (req, res) => {
    // When user submits edited detail

    var editedVal = req.body.edited_value;
    const edit_field = req.params.editfield;

    const invalidStatusArray = [];
    const validationFields = ["username", "email"];
    if (edit_field === "password") {
        const secondPassword = req.body.edited_value2;
        const invalidPasswordStatus = await validatePassword(editedVal, secondPassword);
        invalidStatusArray.push(...invalidPasswordStatus);
    } else if (edit_field === "username") {
        const invalidUsernameStatus = await validateUsername(editedVal);
        credAvailableResult = await checkRegCredentialsAvailable(editedVal);
        if (credAvailableResult.status !== 200) {
            invalidUsernameStatus.push("Username already in use. Please enter a different value.")
        }
        invalidStatusArray.push(...invalidUsernameStatus);
    }
    if (invalidStatusArray.length > 0) {
        const {userid} = req.session;
        const userDetails = await getUserDetails(userid);
        const dataParams = await getDefaultHeaderData(req);
        dataParams["field_label"] = edit_field;
        dataParams["field_value"] = userDetails[edit_field];
        dataParams["validation_issues"] = invalidStatusArray;
        res.render("user_edit", dataParams);
    } else {
        const encryptedFields = ["password", "first_name", "last_name", "email"];
        if (encryptedFields.includes(edit_field)) {
            editedVal = await encryptPII(editedVal);
        }

        // Adding user_id for session
        const {userid} = req.session;
        const valsToUpdate = {"new_val": editedVal, "field_to_update": edit_field, user_id: userid};

        const submissionEndpoint = "http://localhost:3002/emotions/users/update-details";
        await axios
            .put(submissionEndpoint, valsToUpdate, {
                validateStatus: (status) => {
                    return status < 500
                }
            })
            .then(async (response) => {
                console.log(response.data);
                res.redirect("/");

            })
            .catch((error) => {
                console.log(`Error making API request: ${error}`)
                result = {"status": 500, "message": `Error making API request: ${error}`}
            });
    }
}

exports.getDelete = async (req, res) => {
    const {isloggedin} = req.session;
    if (isloggedin) {
        var dataParams = await getDefaultHeaderData(req);
        res.render("delete", dataParams);
    } else {
        res.redirect("/");
    }

}

exports.postDelete = async (req, res) => {
    const {userid} = req.session;

    const submissionEndpoint = "http://localhost:3002/emotions/users/update-details";
    await axios
        .put(submissionEndpoint, valsToUpdate, {
            validateStatus: (status) => {
                return status < 500
            }
        })
        .then(async (response) => {
            console.log(response.data);
            res.redirect("/");

        })
        .catch((error) => {
            console.log(`Error making API request: ${error}`)
            result = {"status": 500, "message": `Error making API request: ${error}`}
        });

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
        credAvailableResult = await checkRegCredentialsAvailable(username);

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
            dataParams["validation_issues"] = ["Username already in use. Please use different" +
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