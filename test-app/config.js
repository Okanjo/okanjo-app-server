const path = require('path');

module.exports = {
    webServer: {

        // https://hapijs.com/api#server()
        hapiServerOptions: {
            // port: 3000 // leave unset to let the OS take the wheel
        },

        // Route options
        routePath: path.join(__dirname, 'routes'), // √

        // Optional settings

        // Do you want Socket.io enabled?
        webSocketEnabled: true, // √
        webSocketConfig: undefined, // socket.io server options

        drainTime: 5000, // how long to wait to drain connection before killing the socket on shutdown (in ms)

        // View handler options
        viewHandlerEnabled: true, // Whether the server should even do view handing at all √
        viewPath: path.join(__dirname, 'views'), // The directory where view files are based out of
        cacheTemplates: false,
        nunjucksEnvOptions: undefined, // http://mozilla.github.io/nunjucks/api.html#configure  - e.g. { noCache: true }
        nunjucksExtensionsPath: path.join(__dirname, 'extensions'), // The directory where extension modules live, sig: function(env) { /* this = webServer */ }

        // Static file handler options
        staticHandlerEnabled: true, // Whether to enable static asset serving
        staticPaths: [ // Array of path to route definitions for arbitrary paths
            { path: path.join(__dirname, 'static'), routePrefix: '/' },
            { path: path.join(__dirname, 'dist'), routePrefix: '/dist', options: { redirectToSlash: true } }
        ],
        staticListingEnabled: false, // Whether to allow directory listings
        staticNpmModules: [ // Array of module names and paths to expose as static paths
            { moduleName: 'async', path: 'dist' } // e.g. node_modules/async/dist/async.min.js -> /vendor/async/async.min.js
        ]

    }
};