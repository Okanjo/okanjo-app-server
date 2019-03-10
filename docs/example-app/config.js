"use strict";
const Path = require('path');

module.exports = {
    webServer: {

        // https://hapijs.com/api#server()
        hapiServerOptions: {
            // port: 3000 // leave unset to let the OS take the wheel
        },

        // Graceful shutdown handling
        drainTime: 5000, // how long to wait to drain connections before killing the socket, in milliseconds, default: 5000

        // Route configuration
        routePath: Path.join(__dirname, 'routes'), // where to find route files, default: undefined


        // Socket.io configuration
        webSocketEnabled: true, // Whether to enable socket.io server, default: false
        webSocketConfig: undefined, // socket.io server options, see: https://socket.io/docs/server-api/#new-server-httpserver-options (default: undefined)

        // View handler configuration
        viewHandlerEnabled: true, // Whether to enable template rendering, default: false
        viewPath: Path.join(__dirname, 'views'), // The directory where view files are based from, required if viewHandlerEnabled is enabled.
        cacheTemplates: false, // Whether to let hapi-vision cache templates for better performance, default: false
        nunjucksEnvOptions: undefined, // http://mozilla.github.io/nunjucks/api.html#configure  - e.g. { noCache: true }
        nunjucksExtensionsPath: Path.join(__dirname, 'view-extensions'), // The directory where extension modules live, sig: function(env) { /* this = webServer */ }

        // Static file handler configuration
        staticHandlerEnabled: true, // Whether to enable static asset serving, default: false
        staticPaths: [ // Array of path to route definitions for arbitrary paths, default: []
            { path: Path.join(__dirname, 'static'), routePrefix: '/' },  // exports the static/ directory under /
            { path: Path.join(__dirname, 'dist'), routePrefix: '/dist' } // exports the dist/ directory under /dist
        ],
        staticListingEnabled: false, // Whether to allow directory listings, default: false
        staticNpmModules: [ // Array of module names and paths to expose as static paths, useful for exposing dependencies on the frontend w/o build tools, default: []
            { moduleName: 'async', path: 'dist' } // e.g. node_modules/async/dist/async.min.js -> /vendor/async/async.min.js
        ]
    }
};