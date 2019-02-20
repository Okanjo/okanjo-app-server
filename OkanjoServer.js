"use strict";

const Hapi = require('hapi');
const Async = require('async');
const FS = require('fs');
const Path  = require('path');

/**
 * Okanjo Server Manager
 */
class OkanjoServer {

    /**
     * Constructor
     * @param {OkanjoApp} app Running application instance
     * @param {*} [config] – server configuration
     * @param {{extensions:*}} [options] – Non-config server options
     * @param {function(err:Error)} callback - Fired when initialized
     */
    constructor(app, config, options, callback) {
        // Verify we have an active application context
        if (!app) {
            throw new Error('Derp. You need to provide the current app context when making a server');
        } else {
            this.app = app;
        }

        // Check config
        if (!config) {
            config = {};
        } else if (typeof config === "function") {
            callback = config;
            options = {};
            config = {};
        }

        // Check for option, callback and set defaults
        if (typeof options === "function") {
            callback = options;
            options = {};
        } else if (!options) {
            options = {};
        }

        // Replace the registration function with one that loads the extensions given
        if (Array.isArray(options.extensions)) {
            this._registerExtensions = function (callback) {
                Async.eachSeries(options.extensions, (extension, cb) => {
                    extension.call(this, cb);
                }, callback);
            };
        }

        // Assign the web server config
        this.config = config;

        // What HTTP port should we listen on
        this.config.port = this.config.port || 3000;

        // Initialize HAPI and extensions
        this.init(callback);
    }

    /**
     * Initializes and starts the web server
     * @param callback
     */
    init(callback) {

        // Make the Hapi server instance
        this.hapi = new Hapi.Server(this.config.hapiServerOptions || undefined);

        // Default connection options
        let connectionOptions = {};
        if (this.config.hapiConnectionOptions) {
            connectionOptions = this.config.hapiConnectionOptions;
        }

        // Override port option
        connectionOptions.port = this.config.port;

        // Open the HAPI connection on the given port
        this.hapi.connection(connectionOptions);

        // Run through the setup process
        Async.series([

            // Hook up additional extensions, like authentication, etc
            this._registerExtensions.bind(this),

            // Hook up web socket listener
            this._registerWebSockets.bind(this),

            // Hook up Nunjucks to HAPI
            this._registerViews.bind(this),

            // Hook up static file handling to HAPI
            this._registerStatic.bind(this),

            // Hookup error reporting handlers
            this._registerErrorHandler.bind(this),

            // Bind web routes
            this._registerRoutes.bind(this)

        ], (err) => {
            if (callback) setImmediate(() => callback(err));
        });

    }

    /**
     * Start up Socket.io on the HAPI socket
     * @param callback - Fired when done
     * @private
     */
    _registerWebSockets(callback) {

        // Only bind socket.io if configured to do so
        if (this.config.webSocketEnabled) {

            // Make the Socket.io instance, bound to our open port
            //noinspection JSUnusedGlobalSymbols
            this.io = require('socket.io')(this.hapi.listener, this.config.webSocketConfig);

        }

        callback();

    }

    /**
     * Register view handler for HAPI
     * @param callback - Fired when done
     * @private
     */
    _registerViews(callback) {

        // Only register view handler if configured to do so
        if (this.config.viewHandlerEnabled) {

            // Make sure we were given a view path
            if (!this.config.viewPath) {
                return callback(Error('Derp! You need to define the viewPath in your webServer config'));
            }

            // Register the hapi vision module, with nunjucks. Sounds legit, right?
            this.hapi.register(require('vision'), (err) => {
                /* istanbul ignore if */
                if (err) {
                    this.app.report(err);
                    return callback(err);
                }

                // Get the nunjucks hapi view integration module
                const nunjucksHapi = require('./NunjucksHapi');

                // Tell nunjucks where our view root is and toss in any other app options
                const viewPath = this.config.viewPath,
                    env = nunjucksHapi.configure(viewPath, this.config.nunjucksEnvOptions); // http://mozilla.github.io/nunjucks/api.html#configure

                // Bind up nunjucks extensions if if configured to do so
                if (this.config.nunjucksExtensionsPath) {
                    FS.readdir(this.config.nunjucksExtensionsPath, (err, files) => {
                        if (err) {
                            this.nunjucksConfigError = new Error('Derp! Your nunjucks extensions path was crap: ' + this.config.nunjucksExtensionsPath);
                            this.app.report(this.nunjucksConfigError);
                        } else {

                            const extensionFileTest = /\.js$/;

                            files
                                .filter((file) => extensionFileTest.test(file))
                                .forEach((file) => {
                                    // Call the extension module handing it the web server context and nunjucks environment
                                    require(Path.join(this.config.nunjucksExtensionsPath, file)).call(this, env);
                                });
                        }

                    });
                }

                // Set the HAPI view handler
                //noinspection JSUnresolvedFunction
                this.hapi.views({
                    engines: {
                        j2: nunjucksHapi
                    },
                    defaultExtension: 'j2',
                    isCached: this.config.cacheTemplates,
                    relativeTo: viewPath,
                    path: viewPath
                    //layoutPath: '../views/layout',
                    //helpersPath: '../views/helpers'
                });

                // Done
                callback();

            });
        } else {
            // No view handler to bind, just bounce
            callback();
        }
    }

    /**
     * Register static handler with HAPI
     * @param callback - Fired when done
     * @private
     */
    _registerStatic(callback) {

        // Only bind the static handler if configured to do so
        if (this.config.staticHandlerEnabled) {

            // Register the inert hapi module for static asset handling
            this.hapi.register(require('inert'), (err) => {
                /* istanbul ignore if */
                if (err) {
                    this.app.report(err);
                    return callback(err);
                }


                // Expose arbitrary static paths
                if (this.config.staticPaths) {

                    // Register each definition as a static path
                    const res = this.config.staticPaths.every((definition, index) => {

                        // Make sure the definition is right
                        if (typeof definition !== "object") {
                            callback(new Error('Derp! Your staticPaths definition needs to be an object with keys path and routePrefix!'));
                            return false;
                        }

                        if (!definition.path) {
                            callback(new Error('Derp! Missing staticPaths path property on definition index #'+index+'!'));
                            return false;
                        }

                        if (!definition.routePrefix) {
                            callback(new Error('Derp! Missing staticPaths routePrefix property on definition index #'+index+'!'));
                            return false;
                        }

                        // Expose everything in the defined module directory path
                        this.hapi.route({
                            method: 'GET',
                            path: definition.routePrefix+(/\/$/.test(definition.routePrefix) ? '' : '/')+'{param*}',
                            config: {
                                tags: ["Excluded"] // Exclude from okanjo-server-docs
                            //    files: {
                            //        relativeTo: __dirname
                            //    }
                            },
                            handler: {
                                directory: {
                                    path: definition.path,
                                    listing: this.config.staticListingEnabled
                                }
                            },
                        });

                        return true;
                    });

                    // Bail out if the setup failed
                    if (!res) return;
                }


                // Helper to expose installed npm modules as static assets
                if (this.config.staticNpmModules) {
                    // Register each module definition as a static path
                    const res2 = this.config.staticNpmModules.every((definition, index) => {

                        // Make sure the definition is right
                        if (typeof definition !== "object") {
                            callback(new Error('Derp! Your static npm module needs to be an object with keys moduleName and path!'));
                            return false;
                        }

                        if (!definition.moduleName) {
                            callback(new Error('Derp! Missing staticNpmModules moduleName property on definition index #'+index+'!'));
                            return false;
                        }

                        if (!definition.path) {
                            callback(new Error('Derp! Missing staticNpmModules path property on definition index #'+index+'!'));
                            return false;
                        }

                        // Expose everything in the defined module directory path
                        this.hapi.route({
                            method: 'GET',
                            path: '/vendor/'+definition.moduleName+'/{param*}',
                            //config: {
                            //    files: {
                            //        relativeTo: __dirname
                            //    }
                            //},
                            handler: {
                                directory: {
                                    path: Path.join(process.cwd(), 'node_modules', definition.moduleName, definition.path),
                                    listing: this.config.staticListingEnabled
                                }
                            }
                        });

                        return true;
                    });

                    // Bail if failed
                    if (!res2) return;
                }

                callback();

            });
        } else {
            // No static handler so get lost
            callback();
        }
    }

    /**
     * Reports request errors to Sentry
     * @param callback
     * @private
     */
    _registerErrorHandler(callback) {

        // Report request errors to sentry
        this.hapi.on('request-error', (request, err) => {

            this.app.report(err, {
                timestamp: request.info.received,
                id: request.id,
                method: request.method,
                path: request.path,
                query: request.query,
                remoteAddress: request.info.remoteAddress,
                userAgent: request.raw.req.headers['user-agent'],
                env: this.app.currentEnvironment,
                source: "hapi: request-error"
            });

        });

        callback();
    }

    /**
     * Listens for shutdown signals to start draining requests and kill the connection when drained
     * @private
     */
    _registerShutdownHandler() {
        this.__sigtermHandler = (/*signal*/) => { this.stop(); };

        process.once('SIGTERM', this.__sigtermHandler);
        process.once('SIGINT', this.__sigtermHandler);
    }

    /**
     * Trash event listeners if registered
     * @private
     */
    _unregisterShutdownHandler() {
        process.removeListener('SIGTERM', this.__sigtermHandler);
        process.removeListener('SIGINT', this.__sigtermHandler);
    }

    //noinspection JSMethodCanBeStatic
    /**
     * Hook point for adding additional HAPI extensions or configurations, such as auth mechanisms
     * @param callback
     * @private
     */
    _registerExtensions(callback) {
        // Overridden by the constructor, if extensions passed in
        callback();
    }

    /**
     * Registers the application routes
     * @param callback
     * @private
     */
    _registerRoutes(callback) {

        // Make sure we have a path to load up routes
        if (this.config.routePath) {

            // Force value to be an array, even if it is not
            if (!Array.isArray(this.config.routePath)) {
                this.config.routePath = [this.config.routePath];
            }

            const routeFileTest = /\.js$/;

            Async.eachSeries(
                this.config.routePath,
                (routePath, next) => {
                    FS.readdir(routePath, (err, files) => {
                        if (err) {
                            this.nunjucksConfigError = new Error('Derp! Your webServer routePath is crap. Got: ' + routePath);
                            this.app.report(this.nunjucksConfigError);
                        } else {

                            files
                                .filter((file) => routeFileTest.test(file))
                                .forEach((file) => {
                                    // Call each route module with the web server as the context
                                    require(Path.join(routePath, file)).call(this);
                                });
                        }

                        // Done
                        next();
                    });
                },
                callback
            );


        } else {
            callback();
        }
    }

    /**
     * Start listing for connections
     * @param callback
     */
    start(callback) {
        this.hapi.start(callback);

        // Start watching for process termination to make graceful shutdown possible
        this._registerShutdownHandler();
    }

    /**
     * Drain active connections and kill the socket when done or timeout.
     * @param callback - Callback to fire, or if not given, will kill the process.
     */
    stop(callback) {

        // Stop watching for process termination because we are shutting down now.
        this._unregisterShutdownHandler();

        this.app.log(' !! Attempting graceful web server shutdown...');
        this.hapi.stop({
            timeout: this.config.drainTime || 5000 // 5 seconds to drain off
        }, (err) => {
            this.app.log(' !! web server stopped');
            if (callback) callback(err);
        });
    }
}

/**
 * Built-in extensions available to applications
 * @type {{jsonpResponseCodeFix: (function), responseErrorReporter: (function)}}
 */
OkanjoServer.extensions = {
    jsonpResponseCodeFix: require('./hapi_extensions/response_code_jsonp'),
    responseErrorReporter: require('./hapi_extensions/response_error_report')
};

module.exports = OkanjoServer;
