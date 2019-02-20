"use strict";

const should = require('should'),
    OkanjoApp = require('okanjo-app'),
    OkanjoServer = require('../OkanjoServer'),
    Path = require('path'),
    Async = require('async'),
    Needle = require('needle');

function isPortInUse(port, fn) {
    const net = require('net'),
        tester = net.createServer(function (socket) {
            socket.write('Echo server\r\n');
            socket.pipe(socket);
        })
            .once('error', function (err) {
                let e = undefined;
                if (err.code !== 'EADDRINUSE') {
                    return e = err;
                }
                process.nextTick(function () {
                    fn(e, true);
                });
            })
            .once('listening', function () {
                tester
                    .once('close', function () {
                        process.nextTick(function () {
                            fn(null, false);
                        });
                    })
                    .close();
            })
            .listen(port, '0.0.0.0');
}


describe('OkanjoServer', function () {

    it('should blow up when no app is given', function () {
        // Nothing is no good
        (function() {
            const server1 = new OkanjoServer();
            server1.should.not.be.ok();
        }).should.throw(/^Derp/);
    });

    it('should handle initialization with no config and no callback', function (done) {

        const app = new OkanjoApp({}),
            server = new OkanjoServer(app);

        server.should.be.ok();
        server.should.be.instanceof(OkanjoServer);
        server.config.should.be.an.Object();
        server.config.port.should.be.exactly(3000);

        setTimeout(function () {

            isPortInUse(3000, function (err, inUse) {
                should(err).not.be.ok();
                should(inUse).be.exactly(false);
                done();
            });

        }, 10);
    });

    it('should be able to start and stop with no config', function (done) {

        const app = new OkanjoApp({}),
            server = new OkanjoServer(app, function (err) {
                should(err).be.exactly(null);

                isPortInUse(3000, function (err, inUse) {
                    should(err).not.be.ok();
                    should(inUse).be.exactly(false);

                    server.start(function (err) {
                        should(err).not.be.ok();

                        isPortInUse(3000, function (err, inUse) {
                            should(err).not.be.ok();
                            should(inUse).be.exactly(true);

                            server.stop(function () {

                                // Annonymous function broke stop, this should check it
                                const stopArgs = Array.prototype.slice.call(arguments);
                                console.log(stopArgs);
                                stopArgs.length.should.be.exactly(1);

                                isPortInUse(3000, function (err, inUse) {
                                    should(err).not.be.ok();
                                    should(inUse).be.exactly(false);

                                    done();
                                });
                            });
                        });
                    });
                });
            });

        server.should.be.ok();
        server.should.be.instanceof(OkanjoServer);
        server.config.should.be.an.Object();
        server.config.port.should.be.exactly(3000);

    });

    it('should be able to stop without a callback', function (done) {

        const app = new OkanjoApp({}),
            server = new OkanjoServer(app, function (err) {
                should(err).be.exactly(null);

                isPortInUse(3000, function (err, inUse) {
                    should(err).not.be.ok();
                    should(inUse).be.exactly(false);

                    server.start(function (err) {
                        should(err).not.be.ok();

                        isPortInUse(3000, function (err, inUse) {
                            should(err).not.be.ok();
                            should(inUse).be.exactly(true);

                            server.stop();

                            setTimeout(function () {

                                isPortInUse(3000, function (err, inUse) {
                                    should(err).not.be.ok();
                                    should(inUse).be.exactly(false);

                                    done();
                                });
                            }, 19);

                        });
                    });
                });
            });

        server.should.be.ok();
        server.should.be.instanceof(OkanjoServer);
        server.config.should.be.an.Object();
        server.config.port.should.be.exactly(3000);

    });

    it('should be able to stop via process signals', function (done) {

        const app = new OkanjoApp({}),
            server = new OkanjoServer(app, function (err) {
                should(err).be.exactly(null);

                isPortInUse(3000, function (err, inUse) {
                    should(err).not.be.ok();
                    should(inUse).be.exactly(false);

                    server.start(function (err) {
                        should(err).not.be.ok();

                        isPortInUse(3000, function (err, inUse) {
                            should(err).not.be.ok();
                            should(inUse).be.exactly(true);

                            // Faking a process signal here, cuz we don't really wanna shutdown tests
                            server.__sigtermHandler('SIGTERM');

                            setTimeout(function () {

                                isPortInUse(3000, function (err, inUse) {
                                    should(err).not.be.ok();
                                    should(inUse).be.exactly(false);

                                    done();
                                });
                            }, 19);

                        });
                    });
                });
            });

        server.should.be.ok();
        server.should.be.instanceof(OkanjoServer);
        server.config.should.be.an.Object();
        server.config.port.should.be.exactly(3000);

    });

    it('should be start with given port', function (done) {

        const app = new OkanjoApp({
                webServer: {
                    port: 6666
                }
            }),
            server = new OkanjoServer(app, app.config.webServer, function (err) {
                should(err).be.exactly(null);

                isPortInUse(6666, function (err, inUse) {
                    should(err).not.be.ok();
                    should(inUse).be.exactly(false);

                    server.start(function (err) {
                        should(err).not.be.ok();

                        isPortInUse(6666, function (err, inUse) {
                            should(err).not.be.ok();
                            should(inUse).be.exactly(true);

                            server.stop(function () {

                                isPortInUse(6666, function (err, inUse) {
                                    should(err).not.be.ok();
                                    should(inUse).be.exactly(false);

                                    done();
                                });
                            });
                        });
                    });
                });
            });

        server.should.be.ok();
        server.should.be.instanceof(OkanjoServer);
        server.config.should.be.an.Object();
        server.config.port.should.be.exactly(6666);

    });

    it('should start socket.io when configured', function (done) {

        const app = new OkanjoApp({
                webServer: {
                    webSocketEnabled: true
                }
            }),
            server = new OkanjoServer(app, app.config.webServer, app.config.webServer, function (err) {
                should(err).be.exactly(null);

                server.io
                    .on('connection', function (socket) {
                        socket.emit('hi', 'there');
                        //socket.on('disconnect', function() {
                        //    console.log('socket disconnected!');
                        //})
                    });

                // Start the server
                server.start(function (err) {
                    should(err).not.be.ok();


                    // Connect a socket
                    const client = require('socket.io-client')('ws://localhost:3000/', {
                        timeout: 1000,
                        transports: ['websocket'],
                        reconnect: false
                    });

                    const state = {
                        connected: false,
                        got_ack: false,
                        disconnected: false
                    };

                    client
                        .on('connect', function () {
                            // Connected! Wait for Ack
                            state.connected.should.be.exactly(false);
                            state.got_ack.should.be.exactly(false);
                            state.disconnected.should.be.exactly(false);
                            state.connected = true;
                        })
                        .on('hi', function (data) {
                            data.should.be.equal('there');
                            state.connected.should.be.exactly(true);
                            state.got_ack.should.be.exactly(false);
                            state.disconnected.should.be.exactly(false);
                            state.got_ack = true;
                            client.disconnect();
                        })
                        .on('connect_error', function (err) {
                            throw err;
                        })
                        .on('error', function (err) {
                            throw err;
                        })
                        .on('disconnect', function () {
                            state.connected.should.be.exactly(true);
                            state.got_ack.should.be.exactly(true);
                            state.disconnected.should.be.exactly(false);
                            state.disconnected = true;

                            server.stop(function (err) {
                                should(err).not.be.ok();
                                done();
                            });
                        });

                });
            });

    });

    it('should explode when view handler enabled but has no path', function (done) {

        const app = new OkanjoApp({
                webServer: {
                    viewHandlerEnabled: true
                }
            });
        new OkanjoServer(app, app.config.webServer, function (err) {
            err.should.match(/^Derp/);
            done();
        });

    });

    it('should init view handler when configured to do so', function (done) {

        const app = new OkanjoApp({
                webServer: {
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views')
                }
            });
        new OkanjoServer(app, app.config.webServer, function (err) {
            should(err).be.exactly(null);
            done();
        });
    });

    it('should explode when nunjucks extensions path is crap', function (done) {

        const app = new OkanjoApp({
                webServer: {
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: "!"
                }
            }),
            server = new OkanjoServer(app, app.config.webServer, function (err) {
                should(err).be.exactly(null);
                should(server.nunjucksConfigError).be.instanceof(Error);
                server.nunjucksConfigError.message.indexOf('Derp! Your nunjucks').should.be.exactly(0);
                done();
            });

    });

    it('should autoload nunjucks extensions when configured to do so', function (done) {

        const app = new OkanjoApp({
                webServer: {
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            });
        new OkanjoServer(app, app.config.webServer, function (err) {
            should(err).be.exactly(null);
            done();
        });
    });

    it('should init when static handler enabled but has no path', function (done) {
        const app = new OkanjoApp({
                webServer: {
                    staticHandlerEnabled: true
                }
            });
        new OkanjoServer(app, app.config.webServer, function (err) {
            should(err).be.exactly(null);
            done();
        });
    });

    it('should init static handler when configured to do so', function (done) {

        const app = new OkanjoApp({
                webServer: {
                    staticHandlerEnabled: true,
                    staticPaths: [ { path: Path.join(__dirname, '..', 'test-app', 'static'), routePrefix: '/' } ]
                }
            });
        new OkanjoServer(app, app.config.webServer, function (err) {
            should(err).be.exactly(null);
            done();
        });
    });

    it('should init static npm modules when configured to do so', function (done) {

        const app = new OkanjoApp({
            webServer: {
                staticHandlerEnabled: true,
                staticPaths: [ { path: Path.join(__dirname, '..', 'test-app', 'static'), routePrefix: '/' }],
                staticNpmModules: [ // Array of module names and paths to expose as static paths
                    {moduleName: 'async', path: 'dist'} // e.g. node_modules/async/dist/async.min.js -> /vendor/async/async.min.js
                ]
            }
        });
        new OkanjoServer(app, app.config.webServer, function (err) {
            should(err).be.exactly(null);
            done();
        });
    });

    it('should handle edge cases with npm modules', function (done) {

        Async.series([

            (next) => {
                const app = new OkanjoApp({
                    webServer: {
                        staticHandlerEnabled: true,
                        staticPaths: [ { path: Path.join(__dirname, '..', 'test-app', 'static'), routePrefix: '/' } ],
                        staticNpmModules: [ // Array of module names and paths to expose as static paths
                            "derp"
                        ]
                    }
                });
                new OkanjoServer(app, app.config.webServer, function (err) {
                    err.should.match(/^Derp.*needs to be an object/);
                    next();
                });
            },

            (next) => {
                const app = new OkanjoApp({
                    webServer: {
                        staticHandlerEnabled: true,
                        staticPaths: [ { path: Path.join(__dirname, '..', 'test-app', 'static'), routePrefix: '/' } ],
                        staticNpmModules: [ // Array of module names and paths to expose as static paths
                            {}
                        ]
                    }
                });

                new OkanjoServer(app, app.config.webServer, function (err) {
                    err.should.match(/^Derp.*moduleName/);
                    next();
                });
            },

            (next) => {
                const app = new OkanjoApp({
                    webServer: {
                        staticHandlerEnabled: true,
                        staticPaths: [ { path: Path.join(__dirname, '..', 'test-app', 'static'), routePrefix: '/' } ],
                        staticNpmModules: [ // Array of module names and paths to expose as static paths
                            {moduleName: "derp"}
                        ]
                    }
                });

                new OkanjoServer(app, app.config.webServer, function (err) {
                    err.should.match(/^Derp.*path property/);
                    next();
                });
            }


        ], done);
    });

    it('should init static paths when configured to do so', function (done) {

        const app = new OkanjoApp({
            webServer: {
                staticHandlerEnabled: true,
                staticPaths: [
                    { path: Path.join(__dirname, '..', 'test-app', 'dist'), routePrefix: '/' }
                ]
            }
        });

        new OkanjoServer(app, app.config.webServer, function (err) {
            should(err).be.exactly(null);
            done();
        });
    });

    it('should init static paths without a trailing slash', function (done) {

        const app = new OkanjoApp({
            webServer: {
                staticHandlerEnabled: true,
                staticPaths: [
                    { path: Path.join(__dirname, '..', 'test-app', 'dist'), routePrefix: '/static' }
                ]
            }
        });
        new OkanjoServer(app, app.config.webServer, function (err) {
            should(err).be.exactly(null);
            done();
        });
    });

    it('should handle edge cases with static paths', function (done) {

        Async.series([

            (next) => {
                const app = new OkanjoApp({
                    webServer: {
                        staticHandlerEnabled: true,
                        staticPaths: [
                            "derp"
                        ]
                    }
                });
                new OkanjoServer(app, app.config.webServer, function (err) {
                    err.should.match(/^Derp.*needs to be an object/);
                    next();
                });
            },

            (next) => {
                const app = new OkanjoApp({
                    webServer: {
                        staticHandlerEnabled: true,
                        staticPaths: [
                            {}
                        ]
                    }
                });

                new OkanjoServer(app, app.config.webServer, function (err) {
                    err.should.match(/^Derp.*path/);
                    next();
                });
            },

            (next) => {
                const app = new OkanjoApp({
                    webServer: {
                        staticHandlerEnabled: true,
                        staticPaths: [ // Array of module names and paths to expose as static paths
                            { path: "derp" }
                        ]
                    }
                });

                new OkanjoServer(app, app.config.webServer, function (err) {
                    err.should.match(/^Derp.*routePrefix property/);
                    next();
                });
            }

        ], done);
    });

    it('should load routes when configured to do so', function (done) {
        const app = new OkanjoApp({
                webServer: {
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes')
                }
            });
        new OkanjoServer(app, app.config.webServer, function (err) {
            should(err).be.exactly(null);
            done();
        });
    });

    it('should load multiple route paths when configured to do so', function (done) {
        const app = new OkanjoApp({
            webServer: {
                routePath: [
                    Path.join(__dirname, '..', 'test-app', 'routes'),
                    Path.join(__dirname, '..', 'test-app', 'routes', 'other')
                ]
            }
        });
        const server = new OkanjoServer(app, app.config.webServer, function (err) {
            should(err).be.exactly(null);
            isPortInUse(3000, function (err, inUse) {
                should(err).not.be.ok();
                should(inUse).be.exactly(false);

                server.start(function (err) {
                    should(err).not.be.ok();

                    isPortInUse(3000, function (err, inUse) {
                        should(err).not.be.ok();
                        should(inUse).be.exactly(true);

                        Async.series([

                            // Check the css file
                            function (cb) {
                                Needle.get('http://localhost:3000/deep', function (err, res) {
                                    should(err).not.be.ok();
                                    res.should.be.an.Object();
                                    console.log(res.statusCode);
                                    console.log(res.body);
                                    res.statusCode.should.be.equal(200);
                                    res.body.should.match(/deeeep/);
                                    cb();
                                });
                            }
                        ], function (err) {
                            should(err).not.be.ok();

                            server.stop(function () {

                                isPortInUse(3000, function (err, inUse) {
                                    should(err).not.be.ok();
                                    should(inUse).be.exactly(false);

                                    done();
                                });
                            });
                        });
                    });
                });
            });
        });
    });

    it('should explode when routes path is crap', function (done) {

        const app = new OkanjoApp({
                webServer: {
                    routePath: "derp"
                }
            }),
            server = new OkanjoServer(app, app.config.webServer, function (err) {
                should(err).be.exactly(null);
                should(server.nunjucksConfigError).be.instanceof(Error);
                server.nunjucksConfigError.message.should.match(/^Derp.*routePath/);
                done();
            });

    });

    it('should serve static assets properly', function(done) {

        const app = new OkanjoApp({
                webServer: {
                    staticHandlerEnabled: true,
                    staticNpmModules: [ // Array of module names and paths to expose as static paths
                        {moduleName: 'async', path: 'dist'} // e.g. node_modules/async/dist/async.min.js -> /vendor/async/async.min.js
                    ],
                    staticPaths: [
                        { path: Path.join(__dirname, '..', 'test-app', 'static'), routePrefix: '/' },
                        { path: Path.join(__dirname, '..', 'test-app', 'dist'), routePrefix: '/dist' }
                    ]
                }
            }),
            server = new OkanjoServer(app, app.config.webServer, function (err) {
                should(err).be.exactly(null);
                isPortInUse(3000, function (err, inUse) {
                    should(err).not.be.ok();
                    should(inUse).be.exactly(false);

                    server.start(function (err) {
                        should(err).not.be.ok();

                        isPortInUse(3000, function (err, inUse) {
                            should(err).not.be.ok();
                            should(inUse).be.exactly(true);

                            Async.series([

                                // Check the css file
                                function(cb) {
                                    Needle.get('http://localhost:3000/css/example.css', function(err, res) {
                                        should(err).not.be.ok();
                                        res.should.be.an.Object();
                                        res.statusCode.should.be.equal(200);
                                        res.body.should.equal('body { color: red; }');
                                        cb();
                                    });
                                },


                                // Check the npm module async vendor asset
                                function(cb) {
                                    Needle.get('http://localhost:3000/vendor/async/async.min.js', function(err, res) {
                                        should(err).not.be.ok();
                                        res.should.be.an.Object();
                                        res.statusCode.should.be.equal(200);
                                        res.body.toString('utf8').should.match(/async\.min\.map/);
                                        cb();
                                    });
                                },


                                // Check the css from staticPaths definition
                                function(cb) {
                                    Needle.get('http://localhost:3000/dist/css/build.css', function(err, res) {
                                        should(err).not.be.ok();
                                        res.should.be.an.Object();
                                        res.statusCode.should.be.equal(200);
                                        res.body.should.equal('body { color: blue; }');
                                        cb();
                                    });
                                },


                                // Check the directory listing
                                function(cb) {
                                    Needle.get('http://localhost:3000/css/', function(err, res) {
                                        should(err).not.be.ok();
                                        res.should.be.an.Object();
                                        res.statusCode.should.be.equal(403);
                                        cb();
                                    });
                                },


                                // Check the directory listing
                                function(cb) {
                                    Needle.get('http://localhost:3000/vendor/async/', function(err, res) {
                                        should(err).not.be.ok();
                                        res.should.be.an.Object();
                                        res.statusCode.should.be.equal(403);
                                        cb();
                                    });
                                }

                            ], function(err) {
                                should(err).not.be.ok();

                                server.stop(function () {

                                    isPortInUse(3000, function (err, inUse) {
                                        should(err).not.be.ok();
                                        should(inUse).be.exactly(false);

                                        done();
                                    });
                                });
                            });

                        });
                    });
                });
            });
    });

    it('should provide a directory listing if configured to do so', function(done) {

        const app = new OkanjoApp({
                webServer: {
                    staticHandlerEnabled: true,
                    staticPaths: [
                        { path: Path.join(__dirname, '..', 'test-app', 'static'), routePrefix: '/' }
                    ],
                    staticNpmModules: [ // Array of module names and paths to expose as static paths
                        {moduleName: 'async', path: 'dist'} // e.g. node_modules/async/dist/async.min.js -> /vendor/async/async.min.js
                    ],
                    staticListingEnabled: true
                }
            }),
            server = new OkanjoServer(app, app.config.webServer, function (err) {
                should(err).be.exactly(null);
                isPortInUse(3000, function (err, inUse) {
                    should(err).not.be.ok();
                    should(inUse).be.exactly(false);

                    server.start(function (err) {
                        should(err).not.be.ok();

                        isPortInUse(3000, function (err, inUse) {
                            should(err).not.be.ok();
                            should(inUse).be.exactly(true);

                            Async.series([


                                // Check the npm module async vendor asset
                                function(cb) {
                                    Needle.get('http://localhost:3000/vendor/async/', function(err, res) {
                                        should(err).not.be.ok();
                                        res.should.be.an.Object();
                                        res.statusCode.should.be.equal(200);
                                        res.body.toString('utf8').should.match(/href="\/vendor\/async\/async\.min\.js">/);
                                        cb();
                                    });
                                },


                                // Check the directory listing
                                function(cb) {
                                    Needle.get('http://localhost:3000/css/', function(err, res) {
                                        should(err).not.be.ok();
                                        res.should.be.an.Object();
                                        res.statusCode.should.be.equal(200);
                                        res.body.toString('utf8').should.match(/href="\/css\/example\.css">/);
                                        cb();
                                    });
                                }

                            ], function(err) {
                                should(err).not.be.ok();

                                server.stop(function () {

                                    isPortInUse(3000, function (err, inUse) {
                                        should(err).not.be.ok();
                                        should(inUse).be.exactly(false);

                                        done();
                                    });
                                });
                            });

                        });
                    });
                });
            });
    });

    it('should render views properly', function(done) {

        const app = new OkanjoApp({
                webServer: {
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            }),
            server = new OkanjoServer(app, app.config.webServer, function (err) {
                should(err).be.exactly(null);
                isPortInUse(3000, function (err, inUse) {
                    should(err).not.be.ok();
                    should(inUse).be.exactly(false);

                    server.start(function (err) {
                        should(err).not.be.ok();

                        isPortInUse(3000, function (err, inUse) {
                            should(err).not.be.ok();
                            should(inUse).be.exactly(true);

                            Needle.get('http://localhost:3000/', function(err, res) {
                                should(err).not.be.ok();
                                res.should.be.an.Object();
                                res.statusCode.should.be.equal(200);

                                res.body.should.match(/hello world roasted default [0-9]+ yay fun roasted 1/);

                                server.stop(function () {

                                    isPortInUse(3000, function (err, inUse) {
                                        should(err).not.be.ok();
                                        should(inUse).be.exactly(false);

                                        done();
                                    });
                                });
                            });

                        });
                    });
                });
            });
    });

    it('should report 500 errors', function(done) {

        const app = new OkanjoApp({
                webServer: {
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            }),
            server = new OkanjoServer(app, app.config.webServer, function (err) {
                should(err).be.exactly(null);
                isPortInUse(3000, function (err, inUse) {
                    should(err).not.be.ok();
                    should(inUse).be.exactly(false);

                    server.start(function (err) {
                        should(err).not.be.ok();

                        isPortInUse(3000, function (err, inUse) {
                            should(err).not.be.ok();
                            should(inUse).be.exactly(true);

                            Needle.get('http://localhost:3000/derp', function(err, res) {
                                should(err).not.be.ok();
                                res.should.be.an.Object();
                                res.statusCode.should.be.equal(500);

                                res.body.should.be.an.Object();
                                should(res.body.statusCode).be.exactly(500);
                                should(res.body.error).be.exactly('Internal Server Error');
                                should(res.body.message).be.exactly('An internal server error occurred');

                                server.stop(function () {

                                    isPortInUse(3000, function (err, inUse) {
                                        should(err).not.be.ok();
                                        should(inUse).be.exactly(false);

                                        done();
                                    });
                                });
                            });

                        });
                    });
                });
            });
    });

});