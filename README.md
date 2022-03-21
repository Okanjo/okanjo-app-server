# Okanjo App Server

[![Node.js CI](https://github.com/Okanjo/okanjo-app-server/actions/workflows/node.js.yml/badge.svg)](https://github.com/Okanjo/okanjo-app-server/actions/workflows/node.js.yml) [![Coverage Status](https://coveralls.io/repos/github/Okanjo/okanjo-app-server/badge.svg?branch=master)](https://coveralls.io/github/Okanjo/okanjo-app-server?branch=master)

Configurable web and API server powered by HAPI for the Okanjo App ecosystem.

This package bundles all the common things needed to build a web or API server, such as:

* Run a HTTP/API server (via [hapi](https://github.com/hapijs/hapi))
* Provides a consistent way for apps to define routes
* Serve static assets (via [inert](https://github.com/hapijs/inert))
* Render template views (via [vision](https://github.com/hapijs/vision) and [nunjucks](https://github.com/mozilla/nunjucks))
* Handle JSONP requests and error responses consistently
* Report bad request responses for dev/production debugging
* Run a WebSocket server (via [socket.io](https://socket.io/))
* Being totally configurable. 

Setup is done mostly through configuration. Using all of these modules together requires a fair amount of boilerplate.
This module attempts to eliminate most of the boilerplate setup with a reusable, configurable module, so your app can 
development time can focus on building the app, not boilerplate.

You should have a basic understanding of how HAPI works, otherwise this module won't make a ton of sense to you.


## Installing

Add to your project like so: 

```sh
npm install okanjo-app-server
```

> Note: requires the [`okanjo-app`](https://github.com/okanjo/okanjo-app) module.

## Breaking Changes

### v3.0.0
- Updated to Hapi v20
- Updated Socket.io to v4.4
- Updated Okanjo-App to v3

### v2.0.0
- Updated to Hapi v18+


## Example Usage

Here's a super basic implementation. 

Your directory structure might look like this:

* `example-app/`
  * `routes/` – place to put your route files
    * `example-routes.js` – example route file, seen below
  * `static/` – place to put your static assets like css, images, js, etc
  * `view-extensions/` – place to stick nunjucks extensions
      * `example-ext.js` – example extension file, seen below
  * `views/` – place to put your view templates
    * `example.j2` – example template, seen below
  * `config.js` – okanjo-app config
  * `index.js` – app entrypoint
  
You can find these example files here: [docs/example-app](https://github.com/okanjo/okanjo-app-server/tree/master/docs/example-app)
  
#### config.js:
```js
"use strict";
const Path = require('path');

module.exports = {
    webServer: {

        // Hapi server / global settings
        hapiServerOptions: {
            // Listening port
            port: 3000, // Port to listen on, default: null (os assigned)
        }, // HAPI server settings, see: // https://hapijs.com/api#server()
                
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
```
This `config.js` includes all available options. You may exclude or comment-out the ones that do not apply to your application.

#### index.js:
```js
"use strict";
const OkanjoApp = require('okanjo-app');
const OkanjoServer = require('okanjo-app-server');

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
        process.exit(1);
    })
;
```

You can make this much more elaborate by starting the server in a worker using okanjo-app-broker so you can hot-reload the entire server on changes, etc.


#### routes/example-routes.js
A route file needs to export a function. The context of the function (`this`) will be the OkanjoServer instance.

Route files are loaded synchronously, so no async operations should be performed.

```js
"use strict";

/**
 * @this OkanjoServer
 */
module.exports = function() {

    // This route replies with a rendered view using the example.j2 template and given context
    this.hapi.route({
        method: 'GET',
        path: '/',
        handler: (request, h) => {
            return h.view('example.j2', {
                boom: "roasted"
            });
        },
        config: {
            // ... validation, authentication. tagging, etc
        }
    });

    // This route replies with an api response
    this.hapi.route({
        method: 'GET',
        path: '/api/sometimes/works',
        handler: async (request, h) => {
            const res = await pretendServiceFunction();     // Fire off a pretend service function
            return this.app.response.ok(res);                    // Return the response
        },
        config: {
            // ... validation, authentication. tagging, etc
        }
    });

    /**
     * Pretend service function that returns a payload or throws an error
     */
    const pretendServiceFunction = async () => {
        if (Math.random() >= 0.50) { // half the time, return an error
            throw this.app.response.badRequest('Nope, not ready yet.');
        } else {
            return { all: 'good' };
        }
    };

};
```

#### view-extensions/example-ext.js
A Nunjucks extension file needs to export a function. The context of the function (`this`) will be the OkanjoServer instance.

Nunjucks extension files are loaded synchronously, so no async operations should be performed.

```js
"use strict";

/**
 * @this OkanjoServer
 * @param env – Nunjucks environment
 */
module.exports = function(env) {
    
    // Remember, this.app is available here :)

    // You could add globals to Nunjucks
    env.addGlobal('env', this.app.currentEnvironment); 
    env.addGlobal('pid', process.pid);
    
    // You could add custom filters to Nunjucks
    env.addFilter('doSomething', (str, count) => {
        // return some string
        return "yay fun " + str + " " + count;
    });
    
};
```


#### views/example.j2
Views are standard Nunjucks templates. For example:

```html
<html>
<head>
    <link rel="stylesheet" href="/css/example.css" />
</head>
<body>
<ul>
    <li>Boom: {{boom}}</li><!-- Set by routes/example-routes.js's GET / route -->
    <li>ENV: {{env}}</li><!-- Set by view-extensions/example-ext.js -->
    <li>PID: {{pid}}</li><!-- Set by view-extensions/example-ext.js -->
    <li>doSomething: {{ boom|doSomething(1) }}</li><!-- Custom filter defined by view-extensions/example-ext.js -->
</ul>
</body>
</html>
```

The template, when rendered via `http://localhost:3000/` shows:
```html
<html>
<head>
    <link rel="stylesheet" href="/css/example.css" />
</head>
<body>
<ul>
    <li>Boom: roasted</li><!-- Set by routes/example-routes.js's GET / route -->
    <li>ENV: default</li><!-- Set by view-extensions/example-ext.js -->
    <li>PID: 2875</li><!-- Set by view-extensions/example-ext.js -->
    <li>doSomething: yay fun roasted 1</li><!-- Custom filter defined by view-extensions/example-ext.js -->
</ul>
</body>
</html>
```

You can create sub-directories and organize your views however you'd like. Utilize Nunjucks' `extends` and `include` operators as you wish. Remember, paths are relative to the configured by `viewPath`.


# OkanjoServer

Server class. Must be instantiated to be used.

## Statics
 * `OkanjoServer.extensions.jsonpResponseCodeFix` – Extension that replaces non 200-level responses with 200 so non-ok level responses can execute on the browser
 * `OkanjoServer.extensions.responseErrorReporter` – Extension that reports 500-level responses via app.report, useful for production monitoring

## Properties
* `server.app` – (read-only) The OkanjoApp instance provided when constructed
* `server.config` – (read-only)  The configuration provided when constructed
* `server.options` – (read-only)  The options provided when constructed
* `server.hapi` – (read-only) The HAPI instance created when initialized.
* `server.io` – (read-only) The socket.io instance created when initialized.

## Methods

### `new OkanjoServer(app, [config, [options]], [callback])`
Creates a new server instance.
* `app` – The OkanjoApp instance to bind to
* `config` – (optional, object) The OkanjoServer configuration, see [config.js](#config.js)
* `options` – (optional, object) Server options object
  * `options.extensions` – Array of functions to call when initializing. Useful for initializing async hapi plugins or custom configurations.
  
For example:

```js
new OkanjoServer(app, config, {
    extensions: [
        
        // Use the built-in extensions
        OkanjoServer.extensions.jsonpResponseCodeFix,   // replaces non 200-level responses with 200 so non-ok level responses can execute on the browser
        OkanjoServer.extensions.responseErrorReporter,  // reports 
        
        // Register a hapi extension, for example, query string parsing (like the old days)
        async function giveMeQueryStringsBack() {
            await this.hapi.register({
                plugin: require('hapi-qs'),
                options: {}
            });
        },
        
        // Register authentication strategies, etc
        async function registerAuthenticationStrategies() {

            // plugin to use HTTP basic auth username as an api key
            await this.hapi.register({
                plugin: require('hapi-auth-basic-key'),
                options: {}
            });
                
            // Register the strategy
            this.hapi.auth.strategy('key-only', 'basic', {
                validateFunc: (req, key, secret, authCallback) => {
                    // FIXME - put your real key authentication here (e.g. db or redis lookup)
                    let valid = key === 'my-secret-key';
                    let err = null;
                    
                    // Pass back validity and credentials if valid
                    authCallback(err, valid, { key });
                }
            });
        }
        
    ]
}, (err) => {
    // server is configured, ready to start
});
```

### `await server.init()`
Configures the underlying services, such as HAPI, Socket.io, etc. Called automatically by `server.start`, if not done manually. Before v2, this was done in the constructor. 
* `callback(err)` – Function to fire once the server has started. If `err` is present, something went wrong.

### `await server.start()`
Starts the server instance. 
* `callback(err)` – Function to fire once the server has started. If `err` is present, something went wrong.
 
### `await server.stop()`
Attempts to gracefully shutdown the server instance. If `config.drainTime` elapses, the socket will be forcibly killed.
* `callback(err)` – Function to fire once the server has stopped. If `err` is present, something went wrong.


## Events

This class fires no events.


## Extending and Contributing 

Our goal is quality-driven development. Please ensure that 100% of the code is covered with testing.

Before contributing pull requests, please ensure that changes are covered with unit tests, and that all are passing. 

### Testing

To run unit tests and code coverage:
```sh
npm run report
```

This will perform:
* Unit tests
* Code coverage report
* Code linting

Sometimes, that's overkill to quickly test a quick change. To run just the unit tests:
 
```sh
npm test
```

or if you have mocha installed globally, you may run `mocha test` instead.
