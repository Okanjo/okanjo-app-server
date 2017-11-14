"use strict";
const OkanjoApp = require('okanjo-app');
// const OkanjoServer = require('okanjo-app-server');
const OkanjoServer = require('../../OkanjoServer');

// Configure the app
const config = require('./config.js');
const app = new OkanjoApp(config);

// Configure the server
const server = new OkanjoServer(app, app.config.webServer, (err) => {
    if (err) {
        console.error('Something failed to initialize: ', err);
        process.exit(1);
    } else {
        // Start the server
        server.start((err) => {
            if (err) {
                console.error('Server failed to start', err);
                process.exit(2);
            } else {
                console.log('Server started at:', server.hapi.info.uri);
                console.log('Use control-C to quit')
            }
        });
    }
});