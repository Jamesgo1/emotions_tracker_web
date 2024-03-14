const crypto = require("crypto");
const axios = require("axios");

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

module.exports = {
    encryptPII,
    decryptPII,
    addToLoginHist,
    getLoginAttempts,
    checkIfAlreadySubmitted,
    checkRegCredentialsAvailable,
    getUserDetails,
    validatePassword,
    validateUsername,
    preprocessInput
};