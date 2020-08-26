"use strict";

const Hapi = require('hapi');
const FS = require('fs');
const Path  = require('path');
const Util = require('util');

const readdir = Util.promisify(FS.readdir);

/**
 * Okanjo Server Manager
 */
class OkanjoServer {

    /**
     * Constructor
     * @param {OkanjoApp} app Running application instance
     * @param {*} [config] – server configuration
     * @param {{extensions:*}} [options] – Non-config server options
     */
    constructor(app, config, options) {
        // Verify we have an active application context
        if (!app) {
            throw new Error('Error: Missing OkanjoApp context');
        } else {
            this.app = app;
        }

        // Check config
        this.config = config || {};
        this.options = options || {};
    }

    /**
     * Initializes and starts the web server
     */
    async init() {

        // Make the Hapi server instance
        this.hapi = new Hapi.Server(this.config.hapiServerOptions || undefined);

        try {

            // Hook up additional extensions, like authentication, etc
            await this._registerExtensions();

            // Hook up web socket listener
            await this._registerWebSockets();

            // Hook up Nunjucks to HAPI
            await this._registerViews();

            // Hook up static file handling to HAPI
            await this._registerStatic();

            // Hookup error reporting handlers
            await this._registerErrorHandler();

            // Bind web routes
            await this._registerRoutes();

        } catch (err) {
            // Report and rethrow
            this.app.report('Failed to initialize OkanjoServer', err);
            throw err;
        }

    }

    /**
     * Start up Socket.io on the HAPI socket
     * @private
     */
    async _registerWebSockets() {
        // Only bind socket.io if configured to do so
        if (this.config.webSocketEnabled) {

            // Make the Socket.io instance, bound to our open port
            //noinspection JSUnusedGlobalSymbols
            this.io = require('socket.io')(this.hapi.listener, this.config.webSocketConfig);
        }
    }

    /**
     * Register view handler for HAPI
     * @private
     */
    async _registerViews() {

        // Only register view handler if configured to do so
        if (this.config.viewHandlerEnabled) {

            // Make sure we were given a view path
            if (!this.config.viewPath) {
                throw Error('Missing: `viewPath` param in OkanjoServer config');
            }

            // Register the Vision module
            await this.hapi.register(require('vision'));

            // Get the nunjucks hapi view integration module
            const nunjucksHapi = require('./NunjucksHapi');

            // Tell nunjucks where our view root is and toss in any other app options
            const viewPath = this.config.viewPath;
            const env = nunjucksHapi.configure(viewPath, this.config.nunjucksEnvOptions); // http://mozilla.github.io/nunjucks/api.html#configure

            // Bind up nunjucks extensions if if configured to do so
            if (this.config.nunjucksExtensionsPath) {

                const files = await readdir(this.config.nunjucksExtensionsPath);

                const extensionFileTest = /\.js$/;

                files
                    .filter((file) => extensionFileTest.test(file))
                    .forEach((file) => {
                        // Call the extension module handing it the web server context and nunjucks environment
                        require(Path.join(this.config.nunjucksExtensionsPath, file)).call(this, env);
                    })
                ;
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

        }
    }

    /**
     * Register static handler with HAPI
     * @private
     */
    async _registerStatic() {

        // Only bind the static handler if configured to do so
        if (this.config.staticHandlerEnabled) {

            // Register the inert hapi module for static asset handling
            await this.hapi.register(require('inert'));

            // Expose arbitrary static paths
            if (this.config.staticPaths) {

                // Validate
                this.config.staticPaths.forEach((definition, index) => {

                    if (typeof definition !== "object") {
                        throw new Error('Error: OkanjoServer `staticPaths` option should be an object with keys `path` and `routePrefix`.');
                    }

                    if (!definition.path) {
                        throw new Error(`Error: OkanjoServer \`staticPaths\` entry is missing property \`path\` (index ${index}`);
                    }

                    if (!definition.routePrefix) {
                        throw new Error(`Error: OkanjoServer \`staticPaths\` entry is missing property \`routePrefix\` (index ${index}`);
                    }

                    const options = definition.options || {};

                    // Set up the static inert route
                    this.hapi.route({
                        method: 'GET',
                        path: definition.routePrefix + (/\/$/.test(definition.routePrefix) ? '' : '/') + '{param*}',
                        config: {
                            tags: ["Excluded"] // Exclude from okanjo-server-docs
                            //    files: {
                            //        relativeTo: __dirname
                            //    }
                        },
                        handler: {
                            directory: {
                                path: definition.path,
                                listing: this.config.staticListingEnabled,
                                ...options
                            }
                        },
                    });

                });
            }


            // Helper to expose installed npm modules as static assets
            if (this.config.staticNpmModules) {

                // Register each module definition as a static path
                this.config.staticNpmModules.forEach((definition, index) => {

                    if (typeof definition !== "object") {
                        throw new Error('Error: OkanjoServer `staticPaths` option should be an object with keys `path` and `routePrefix`.');
                    }

                    if (!definition.path) {
                        throw new Error(`Error: OkanjoServer \`staticPaths\` entry is missing property \`path\` (index ${index}`);
                    }

                    if (!definition.moduleName) {
                        throw new Error(`Error: OkanjoServer \`staticPaths\` entry is missing property \`moduleName\` (index ${index}`);
                    }

                    // Expose everything in the defined module directory path
                    this.hapi.route({
                        method: 'GET',
                        path: '/vendor/' + definition.moduleName + '/{param*}',
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

                });

            }
        }
    }

    /**
     * Reports request errors to Sentry
     * @private
     */
    async _registerErrorHandler() {

        // Report request errors to sentry
        this.hapi.events.on({ name: 'request', channels: 'error' }, (request, event, tags) => {

            this.app.report(event.error, {
                timestamp: request.info.received,
                id: request.id,
                method: request.method,
                path: request.path,
                query: request.query,
                remoteAddress: request.info.remoteAddress,
                userAgent: request.raw.req.headers['user-agent'],
                env: this.app.currentEnvironment,
                source: "hapi: request-error",
                event,
                tags
            });

        });
    }

    /**
     * Listens for shutdown signals to start draining requests and kill the connection when drained
     * @private
     */
    _registerShutdownHandler() {
        this.__sigtermHandler = async (/*signal*/) => {
            try {
                await this.stop();
            } catch (err) {
                // eat the stop err, it might already be shutting down
            }
        };

        process.once('SIGTERM', this.__sigtermHandler);
        process.once('SIGINT', this.__sigtermHandler);
    }

    /**
     * Trash event listeners if registered
     * @private
     */
    _unregisterShutdownHandler() {
        if (this.__sigtermHandler) {
            process.removeListener('SIGTERM', this.__sigtermHandler);
            process.removeListener('SIGINT', this.__sigtermHandler);
        }
    }

    //noinspection JSMethodCanBeStatic
    /**
     * Hook point for adding additional HAPI extensions or configurations, such as auth mechanisms
     * @private
     */
    async _registerExtensions() {
        // Call each extension
        for (const ext of this.options.extensions || []) {
            if (ext.constructor.name === 'AsyncFunction') {
                await ext.call(this);
            } else if (ext instanceof Promise) {
                await ext;
            } else {
                // Deprecated, but here for backwards compatibility
                await Util.promisify(ext.bind(this))(); // <-- unbounded
            }
        }
    }

    /**
     * Registers the application routes
     * @private
     */
    async _registerRoutes() {

        // Make sure we have a path to load up routes
        if (this.config.routePath) {

            // Force value to be an array, even if it is not
            if (!Array.isArray(this.config.routePath)) {
                this.config.routePath = [this.config.routePath];
            }

            const routeFileTest = /\.js$/;

            for (const routePath of this.config.routePath) {
                const files = await readdir(routePath);

                files
                    .filter((file) => routeFileTest.test(file))
                    .forEach((file) => {
                        // call the module with the server as the context
                        require(Path.join(routePath, file)).call(this);
                    })
                ;
            }

        }
    }

    /**
     * Start listing for connections
     */
    async start() {

        // Initialize if not already initialized
        if (!this.hapi) {
            await this.init();
        }

        // Start HAPI
        await this.hapi.start();

        // Start watching for process termination to make graceful shutdown possible
        this._registerShutdownHandler();
    }

    /**
     * Drain active connections and kill the socket when done or timeout.
     */
    async stop() {

        // Stop watching for process termination because we are shutting down now.
        this._unregisterShutdownHandler();

        // Stop HAPI
        if (this.hapi) {
            this.app.log(' !! Attempting graceful web server shutdown...');
            await this.hapi.stop({
                timeout: this.config.drainTime || 5000 // 5 seconds to drain off
            });
            this.app.log(' !! web server stopped');
        }
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
