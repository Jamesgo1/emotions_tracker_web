# Welcome to the Emotions Tracker Web App

![A snapshot of the project](https://i.gyazo.com/b0c6274ca9c22f85e85df22fcf93b02d.png)
## Getting Started

1) Make sure to clone the separate REST API project from [here](https://github.com/Jamesgo1/emotions_tracker_api)
2) Install the require packages with `npm install`
3) Create your own config.env file in the root of the project. You will need to specify the following values: 
   1) PORT, 
   2) ENCRYPT_KEY (a random 32 character string for encryption), 
   3) CAT_API (optional)
4) Ensure you have attached a database in the API project.


## Project Feaures

- Easy to implement two-way encryption for sensitive data 
- Responsive UI using Bulma
- Provide insight into emotions that are tracked with graphs using Chartist.js
- Login and registration validation
- Account suspension for too many login attempts
- Easy for the user to view, modify and delete their data

