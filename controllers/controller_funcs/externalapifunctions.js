const axios = require("axios");

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

module.exports = {getCatPic};