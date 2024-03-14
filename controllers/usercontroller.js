const axios = require("axios");

const {add} = require("nodemon/lib/rules");
const efuncs = require("./controller_funcs/emotionfunctions");
const ufuncs = require("./controller_funcs/userfunctions");
const apifuncs = require("./controller_funcs/externalapifunctions");

exports.getLogin = async (req, res) => {
    var defaultParams = await efuncs.getDefaultHeaderData(req)
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
                const decryptedPW = await ufuncs.decryptPII(dbPassword);
                const totalFailedLogins = await ufuncs.getLoginAttempts(dbuserid);
                if (totalFailedLogins.status !== 200) {
                    await ufuncs.addToLoginHist(-1, dbuserid);
                    dataParams = await efuncs.getDefaultHeaderData(req);
                    console.log("Too many failed logins status:")
                    console.log(totalFailedLogins.status);
                    dataParams["status_code"] = totalFailedLogins.status;
                    res.render("login", dataParams);
                } else {
                    //Success
                    if (password === decryptedPW) {
                        const session = req.session;
                        session.isloggedin = true;
                        session.userid = dbuserid;
                        await ufuncs.addToLoginHist(1, dbuserid);
                        res.redirect('/');
                    } else {
                        await ufuncs.addToLoginHist(0, dbuserid);
                        dataParams = await efuncs.getDefaultHeaderData(req);
                        console.log("Incorrect password")
                        console.log(usernameStatus);
                        dataParams["status_code"] = 401;
                        res.render("login", dataParams);
                    }

                }
            } else {
                dataParams = await efuncs.getDefaultHeaderData(req);
                console.log("No username:")
                console.log(usernameStatus);
                dataParams["status_code"] = usernameStatus;
                res.render("login", dataParams);

            }
        })
};

exports.getLogout = async (req, res) => {
    var dataParams = await efuncs.getDefaultHeaderData(req);
    res.render("logout", dataParams);
}

exports.postLogout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
};


exports.getRegister = async (req, res) => {
    var dataParams = await efuncs.getDefaultHeaderData(req);
    dataParams["status_code"] = 0;
    dataParams["validation_issues"] = [];
    res.render("register", dataParams);
};

exports.getProfile = async (req, res) => {
    // A place for the user to view, edit and delete their information
    const {userid, isloggedin} = req.session;
    if (isloggedin) {
        const decryptedDetails = await ufuncs.getUserDetails(userid);
        const dataParams = await efuncs.getDefaultHeaderData(req);
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
        const userDetails = await ufuncs.getUserDetails(userid);
        const dataParams = await efuncs.getDefaultHeaderData(req);
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
        const invalidPasswordStatus = await ufuncs.validatePassword(editedVal, secondPassword);
        invalidStatusArray.push(...invalidPasswordStatus);
    } else if (edit_field === "username") {
        const invalidUsernameStatus = await ufuncs.validateUsername(editedVal);
        credAvailableResult = await ufuncs.checkRegCredentialsAvailable(editedVal);
        if (credAvailableResult.status !== 200) {
            invalidUsernameStatus.push("Username already in use. Please enter a different value.")
        }
        invalidStatusArray.push(...invalidUsernameStatus);
    }
    if (invalidStatusArray.length > 0) {
        const {userid} = req.session;
        const userDetails = await ufuncs.getUserDetails(userid);
        const dataParams = await efuncs.getDefaultHeaderData(req);
        dataParams["field_label"] = edit_field;
        dataParams["field_value"] = userDetails[edit_field];
        dataParams["validation_issues"] = invalidStatusArray;
        res.render("user_edit", dataParams);
    } else {
        const encryptedFields = ["password", "first_name", "last_name", "email"];
        if (encryptedFields.includes(edit_field)) {
            editedVal = await ufuncs.encryptPII(editedVal);
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
        var dataParams = await efuncs.getDefaultHeaderData(req);
        res.render("delete", dataParams);
    } else {
        res.redirect("/");
    }

};

exports.postDelete = async (req, res) => {
    const {userid} = req.session;

    const submissionEndpoint = `http://localhost:3002/emotions/users/delete/${userid}`;
    await axios
        .delete(submissionEndpoint)
        .then(async (response) => {
            console.log(response.data);
            req.session.destroy(() => {
                res.redirect('/');
            });

        })
        .catch((error) => {
            console.log(`Error making API request: ${error}`)
            result = {"status": 500, "message": `Error making API request: ${error}`}
        });

};


exports.postRegister = async (req, res) => {
    console.log("Encryption:")
    var allRegisterVals = {username, password, password2, first_name, last_name, postcode, country, email} = req.body;

    const invalidStatusArray = [];
    dataParams = await efuncs.getDefaultHeaderData(req);
    console.log("before:")
    console.log(allRegisterVals)
    allRegisterVals = await ufuncs.preprocessInput(allRegisterVals)
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
    } = await ufuncs.preprocessInput(allRegisterVals)
    const invalidPasswordStatus = await ufuncs.validatePassword(password, password2);
    console.log(invalidPasswordStatus)
    invalidStatusArray.push(...invalidPasswordStatus);
    const invalidUsernameStatus = await ufuncs.validateUsername(username);
    invalidStatusArray.push(...invalidUsernameStatus);

    if (invalidStatusArray.length > 0) {
        console.log("Invalid statuses:")
        console.log(invalidStatusArray);
        dataParams["validation_issues"] = invalidStatusArray;
        res.render("register", dataParams);
    } else {
        const encryptedFirstName = await ufuncs.encryptPII(first_name);
        const encryptedLastName = await ufuncs.encryptPII(last_name);
        const encryptedPassword = await ufuncs.encryptPII(password);
        const encryptedEmail = await ufuncs.encryptPII(email);
        const valsToRegister = {
            username,
            encryptedPassword,
            encryptedFirstName,
            encryptedLastName,
            postcode,
            country,
            encryptedEmail
        }

        dataParams = await efuncs.getDefaultHeaderData(req);
        credAvailableResult = await ufuncs.checkRegCredentialsAvailable(username);

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