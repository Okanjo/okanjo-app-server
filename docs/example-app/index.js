"use strict";
const OkanjoApp = require('okanjo-app');
// const OkanjoServer = require('okanjo-app-server'); // use this one for real
const OkanjoServer = require('../../OkanjoServer');

// Configure the app
const config = require('./config.js');
const app = new OkanjoApp(config);

// Configure the server
const server = new OkanjoServer(app, app.config.webServer);

// Start it up
(async () => {
    await server.init(); // optional, if you wish to do your own setup before starting HAPI
    await server.start();
})()
    .then(() => {
        console.log('Server started at:', server.hapi.info.uri);
        console.log('Use Control-C to quit')
    })
    .catch((err) => {
        console.error('Something went horribly wrong', err);
        process.exit(2);
    })
;