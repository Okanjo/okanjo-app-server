"use strict";

const should = require('should');
const OkanjoApp = require('okanjo-app');
const OkanjoServer = require('../OkanjoServer');
const Path = require('path');
const Async = require('async');
const Needle = require('needle');

function isPortInUse(port, fn) {
    const net = require('net'),
        tester = net.createServer(socket => {
            socket.write('Echo server\r\n');
            socket.pipe(socket);
        })
            .once('error', err => {
                let e = undefined;
                if (err.code !== 'EADDRINUSE') {
                    return e = err;
                }
                process.nextTick(() => {
                    fn(e, true);
                });
            })
            .once('listening', () => {
                tester
                    .once('close', () => {
                        process.nextTick(() => {
                            fn(null, false);
                        });
                    })
                    .close();
            })
            .listen(port, '0.0.0.0');
}


describe('OkanjoServer', () => {

    it('should blow up when no app is given', () => {
        // Nothing is no good
        (() => {
            const server1 = new OkanjoServer();
            server1.should.not.be.ok();
        }).should.throw(/Missing OkanjoApp/);
    });

    it('should handle initialization with no config', done => {

        const app = new OkanjoApp({});
        const server = new OkanjoServer(app);

        server.should.be.ok();
        server.should.be.instanceof(OkanjoServer);
        server.config.should.be.an.Object();

        server.init().then(() => {
            setTimeout(() => {

                isPortInUse(server.hapi.info.port, (err, inUse) => {
                    should(err).not.be.ok();
                    should(inUse).be.exactly(false);
                    done();
                });

            }, 10);
        });

    });

    it('should be able to start and stop with no config', done => {

        const app = new OkanjoApp({});
        const server = new OkanjoServer(app);
        server.init().then(() => {
            isPortInUse(server.hapi.info.port, (err, inUse) => {
                should(err).not.be.ok();
                should(inUse).be.exactly(false);

                server.start().then(() => {

                    isPortInUse(server.hapi.info.port, (err, inUse) => {
                        should(err).not.be.ok();
                        should(inUse).be.exactly(true);

                        server.stop().then(() => {

                            // Anonymous function broke stop, this should check it
                            // const stopArgs = Array.prototype.slice.call(arguments);
                            // console.log(stopArgs);
                            // stopArgs.length.should.be.exactly(1);

                            isPortInUse(server.hapi.info.port, (err, inUse) => {
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


    });

    it('should be able to stop via process signals', done => {

        const app = new OkanjoApp({});
        const server = new OkanjoServer(app);

        server.init().then(() => {
            isPortInUse(server.hapi.info.port, (err, inUse) => {
                should(err).not.be.ok();
                should(inUse).be.exactly(false);

                server.start().then(() => {
                    should(err).not.be.ok();

                    isPortInUse(server.hapi.info.port, (err, inUse) => {
                        should(err).not.be.ok();
                        should(inUse).be.exactly(true);

                        // Faking a process signal here, cuz we don't really wanna shutdown tests
                        server.__sigtermHandler('SIGTERM');

                        setTimeout(() => {

                            isPortInUse(server.hapi.info.port, (err, inUse) => {
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


    });

    it('should be start with given port', done => {

        const app = new OkanjoApp({
            webServer: {
                hapiServerOptions: {
                    port: 6666
                }
            }
        });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().then(() => {

            isPortInUse(6666, (err, inUse) => {
                should(err).not.be.ok();
                should(inUse).be.exactly(false);

                server.start().then(() => {
                    should(err).not.be.ok();

                    isPortInUse(6666, (err, inUse) => {
                        should(err).not.be.ok();
                        should(inUse).be.exactly(true);

                        server.stop().then(() => {

                            isPortInUse(6666, (err, inUse) => {
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

    });

    it('should start socket.io when configured', done => {

        const app = new OkanjoApp({
            webServer: {
                webSocketEnabled: true
            }
        });
        const server = new OkanjoServer(app, app.config.webServer, app.config.webServer);
        server.init().then(() => {

            server.io
                .on('connection', socket => {
                    socket.emit('hi', 'there');
                    //socket.on('disconnect', function() {
                    //    console.log('socket disconnected!');
                    //})
                });

            // Start the server
            server.start().then(() => {

                // Connect a socket
                const client = require('socket.io-client')(`ws://localhost:${server.hapi.info.port}/`, {
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
                    .on('connect', () => {
                        // Connected! Wait for Ack
                        state.connected.should.be.exactly(false);
                        state.got_ack.should.be.exactly(false);
                        state.disconnected.should.be.exactly(false);
                        state.connected = true;
                    })
                    .on('hi', data => {
                        data.should.be.equal('there');
                        state.connected.should.be.exactly(true);
                        state.got_ack.should.be.exactly(false);
                        state.disconnected.should.be.exactly(false);
                        state.got_ack = true;
                        client.disconnect();
                    })
                    .on('connect_error', err => {
                        throw err;
                    })
                    .on('error', err => {
                        throw err;
                    })
                    .on('disconnect', () => {
                        state.connected.should.be.exactly(true);
                        state.got_ack.should.be.exactly(true);
                        state.disconnected.should.be.exactly(false);
                        state.disconnected = true;

                        server.stop().then(() => {
                            done();
                        });
                    });

            });
        });

    });

    it('should explode when view handler enabled but has no path', done => {

        const app = new OkanjoApp({
                webServer: {
                    viewHandlerEnabled: true
                }
            });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().catch((err) => {
            err.should.match(/viewPath/);
            done();
        });

    });

    it('should init view handler when configured to do so', done => {

        const app = new OkanjoApp({
                webServer: {
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views')
                }
            });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().then(() => {
            done();
        });
    });

    it('should explode when nunjucks extensions path is crap', done => {

        const app = new OkanjoApp({
            webServer: {
                viewHandlerEnabled: true,
                viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                nunjucksExtensionsPath: "!"
            }
        });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().catch((err) => {
            err.message.should.match(/ENOENT/);
            done();
        });

    });

    it('should autoload nunjucks extensions when configured to do so', done => {

        const app = new OkanjoApp({
                webServer: {
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().then(() => {
            done();
        });
    });

    it('should init when static handler enabled but has no path', done => {
        const app = new OkanjoApp({
                webServer: {
                    staticHandlerEnabled: true
                }
            });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().then(() => {
            done();
        });
    });

    it('should init static handler when configured to do so', done => {

        const app = new OkanjoApp({
                webServer: {
                    staticHandlerEnabled: true,
                    staticPaths: [ { path: Path.join(__dirname, '..', 'test-app', 'static'), routePrefix: '/' } ]
                }
            });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().then(() => {
            done();
        });
    });

    it('should init static npm modules when configured to do so', done => {

        const app = new OkanjoApp({
            webServer: {
                staticHandlerEnabled: true,
                staticPaths: [ { path: Path.join(__dirname, '..', 'test-app', 'static'), routePrefix: '/' }],
                staticNpmModules: [ // Array of module names and paths to expose as static paths
                    {moduleName: 'async', path: 'dist'} // e.g. node_modules/async/dist/async.min.js -> /vendor/async/async.min.js
                ]
            }
        });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().then(() => {
            done();
        });
    });

    it('should handle edge cases with npm modules', done => {

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
                const server = new OkanjoServer(app, app.config.webServer);
                server.init().catch((err) => {
                    err.message.should.match(/be an object/);
                    next();
                });
            },

            (next) => {
                const app = new OkanjoApp({
                    webServer: {
                        staticHandlerEnabled: true,
                        staticPaths: [ { path: Path.join(__dirname, '..', 'test-app', 'static'), routePrefix: '/' } ],
                        staticNpmModules: [ // Array of module names and paths to expose as static paths
                            { path: 'bogus' }
                        ]
                    }
                });

                const server = new OkanjoServer(app, app.config.webServer);
                server.init().catch((err) => {
                    err.message.should.match(/moduleName/);
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

                const server = new OkanjoServer(app, app.config.webServer);
                server.init().catch((err) => {
                    err.message.should.match(/path/);
                    next();
                });
            }


        ], done);
    });

    it('should init static paths when configured to do so', done => {

        const app = new OkanjoApp({
            webServer: {
                staticHandlerEnabled: true,
                staticPaths: [
                    { path: Path.join(__dirname, '..', 'test-app', 'dist'), routePrefix: '/' }
                ]
            }
        });

        const server = new OkanjoServer(app, app.config.webServer);
        server.init().then(() => {
            done();
        });
    });

    it('should init static paths without a trailing slash', done => {

        const app = new OkanjoApp({
            webServer: {
                staticHandlerEnabled: true,
                staticPaths: [
                    { path: Path.join(__dirname, '..', 'test-app', 'dist'), routePrefix: '/static' }
                ]
            }
        });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().then(() => {
            done();
        });
    });

    it('should handle edge cases with static paths', done => {

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
                const server = new OkanjoServer(app, app.config.webServer);
                server.init().catch((err) => {
                    err.message.should.match(/be an object/);
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

                const server = new OkanjoServer(app, app.config.webServer);
                server.init().catch((err) => {
                    err.should.match(/path/);
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

                const server = new OkanjoServer(app, app.config.webServer);
                server.init().catch((err) => {
                    err.should.match(/routePrefix/);
                    next();
                });
            }

        ], done);
    });

    it('should load routes when configured to do so', done => {
        const app = new OkanjoApp({
                webServer: {
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes')
                }
            });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().then(() => {
            done();
        });
    });

    it('should load multiple route paths when configured to do so', done => {
        const app = new OkanjoApp({
            webServer: {
                routePath: [
                    Path.join(__dirname, '..', 'test-app', 'routes'),
                    Path.join(__dirname, '..', 'test-app', 'routes', 'other')
                ]
            }
        });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().then(() => {
            isPortInUse(server.hapi.info.port, (err, inUse) => {
                should(err).not.be.ok();
                should(inUse).be.exactly(false);

                server.start().then(() => {
                    should(err).not.be.ok();

                    isPortInUse(server.hapi.info.port, (err, inUse) => {
                        should(err).not.be.ok();
                        should(inUse).be.exactly(true);

                        Async.series([

                            // Check the css file
                            cb => {
                                Needle.get(`http://localhost:${server.hapi.info.port}/deep`, (err, res) => {
                                    should(err).not.be.ok();
                                    res.should.be.an.Object();
                                    // console.log(res.statusCode);
                                    // console.log(res.body);
                                    res.statusCode.should.be.equal(200);
                                    res.body.should.match(/deeeep/);
                                    cb();
                                });
                            }
                        ], err => {
                            should(err).not.be.ok();

                            server.stop().then(() => {

                                isPortInUse(server.hapi.info.port, (err, inUse) => {
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

    it('should explode when routes path is crap', done => {

        const app = new OkanjoApp({
            webServer: {
                routePath: "derp"
            }
        });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().catch((err) => {
            should(err.message).match(/ENOENT/);
            done();
        });

    });

    it('should serve static assets properly', done => {

        const app = new OkanjoApp({
            webServer: {
                staticHandlerEnabled: true,
                staticNpmModules: [ // Array of module names and paths to expose as static paths
                    {moduleName: 'async', path: 'dist'} // e.g. node_modules/async/dist/async.min.js -> /vendor/async/async.min.js
                ],
                staticPaths: [
                    {path: Path.join(__dirname, '..', 'test-app', 'static'), routePrefix: '/'},
                    {path: Path.join(__dirname, '..', 'test-app', 'dist'), routePrefix: '/dist'}
                ]
            }
        });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().then(() => {
            isPortInUse(server.hapi.info.port, (err, inUse) => {
                should(err).not.be.ok();
                should(inUse).be.exactly(false);

                server.start().then(() => {
                    should(err).not.be.ok();

                    isPortInUse(server.hapi.info.port, (err, inUse) => {
                        should(err).not.be.ok();
                        should(inUse).be.exactly(true);

                        Async.series([

                            // Check the css file
                            cb => {
                                Needle.get(`http://localhost:${server.hapi.info.port}/css/example.css`, (err, res) => {
                                    should(err).not.be.ok();
                                    res.should.be.an.Object();
                                    res.statusCode.should.be.equal(200);
                                    res.body.should.equal('body { color: red; }');
                                    cb();
                                });
                            },


                            // Check the npm module async vendor asset
                            cb => {
                                Needle.get(`http://localhost:${server.hapi.info.port}/vendor/async/async.min.js`, (err, res) => {
                                    should(err).not.be.ok();
                                    res.should.be.an.Object();
                                    res.statusCode.should.be.equal(200);
                                    res.body.toString('utf8').should.match(/async\.min\.map/);
                                    cb();
                                });
                            },


                            // Check the css from staticPaths definition
                            cb => {
                                Needle.get(`http://localhost:${server.hapi.info.port}/dist/css/build.css`, (err, res) => {
                                    should(err).not.be.ok();
                                    res.should.be.an.Object();
                                    res.statusCode.should.be.equal(200);
                                    res.body.should.equal('body { color: blue; }');
                                    cb();
                                });
                            },


                            // Check the directory listing
                            cb => {
                                Needle.get(`http://localhost:${server.hapi.info.port}/css/`, (err, res) => {
                                    should(err).not.be.ok();
                                    res.should.be.an.Object();
                                    res.statusCode.should.be.equal(403);
                                    cb();
                                });
                            },


                            // Check the directory listing
                            cb => {
                                Needle.get(`http://localhost:${server.hapi.info.port}/vendor/async/`, (err, res) => {
                                    should(err).not.be.ok();
                                    res.should.be.an.Object();
                                    res.statusCode.should.be.equal(403);
                                    cb();
                                });
                            }

                        ], err => {
                            should(err).not.be.ok();

                            server.stop().then(() => {

                                isPortInUse(server.hapi.info.port, (err, inUse) => {
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

    it('should provide a directory listing if configured to do so', done => {

        const app = new OkanjoApp({
            webServer: {
                staticHandlerEnabled: true,
                staticPaths: [
                    {path: Path.join(__dirname, '..', 'test-app', 'static'), routePrefix: '/'}
                ],
                staticNpmModules: [ // Array of module names and paths to expose as static paths
                    {moduleName: 'async', path: 'dist'} // e.g. node_modules/async/dist/async.min.js -> /vendor/async/async.min.js
                ],
                staticListingEnabled: true
            }
        });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().then(() => {
            isPortInUse(server.hapi.info.port, (err, inUse) => {
                should(err).not.be.ok();
                should(inUse).be.exactly(false);

                server.start().then(() => {
                    should(err).not.be.ok();

                    isPortInUse(server.hapi.info.port, (err, inUse) => {
                        should(err).not.be.ok();
                        should(inUse).be.exactly(true);

                        Async.series([

                            // Check the npm module async vendor asset
                            cb => {
                                Needle.get(`http://localhost:${server.hapi.info.port}/vendor/async/`, (err, res) => {
                                    should(err).not.be.ok();
                                    res.should.be.an.Object();
                                    res.statusCode.should.be.equal(200);
                                    res.body.toString('utf8').should.match(/href="\/vendor\/async\/async\.min\.js">/);
                                    cb();
                                });
                            },


                            // Check the directory listing
                            cb => {
                                Needle.get(`http://localhost:${server.hapi.info.port}/css/`, (err, res) => {
                                    should(err).not.be.ok();
                                    res.should.be.an.Object();
                                    res.statusCode.should.be.equal(200);
                                    res.body.toString('utf8').should.match(/href="\/css\/example\.css">/);
                                    cb();
                                });
                            }

                        ], err => {
                            should(err).not.be.ok();

                            server.stop().then(() => {

                                isPortInUse(server.hapi.info.port, (err, inUse) => {
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

    it('should render views properly', done => {

        const app = new OkanjoApp({
            webServer: {
                routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                viewHandlerEnabled: true,
                viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
            }
        });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().then(() => {
            isPortInUse(server.hapi.info.port, (err, inUse) => {
                should(err).not.be.ok();
                should(inUse).be.exactly(false);

                server.start().then(() => {
                    should(err).not.be.ok();

                    isPortInUse(server.hapi.info.port, (err, inUse) => {
                        should(err).not.be.ok();
                        should(inUse).be.exactly(true);

                        Needle.get(`http://localhost:${server.hapi.info.port}/`, (err, res) => {
                            should(err).not.be.ok();
                            res.should.be.an.Object();
                            res.statusCode.should.be.equal(200);

                            res.body.should.match(/hello world roasted default [0-9]+ yay fun roasted 1/);

                            server.stop().then(() => {

                                isPortInUse(server.hapi.info.port, (err, inUse) => {
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

    it('should report 500 errors', done => {

        const app = new OkanjoApp({
            webServer: {
                routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                viewHandlerEnabled: true,
                viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
            }
        });
        const server = new OkanjoServer(app, app.config.webServer);
        server.init().then(() => {
            isPortInUse(server.hapi.info.port, (err, inUse) => {
                should(err).not.be.ok();
                should(inUse).be.exactly(false);

                server.start().then(() => {
                    should(err).not.be.ok();

                    isPortInUse(server.hapi.info.port, (err, inUse) => {
                        should(err).not.be.ok();
                        should(inUse).be.exactly(true);

                        Needle.get(`http://localhost:${server.hapi.info.port}/derp`, (err, res) => {
                            should(err).not.be.ok();
                            res.should.be.an.Object();
                            res.statusCode.should.be.equal(500);

                            res.body.should.be.an.Object();
                            should(res.body.statusCode).be.exactly(500);
                            should(res.body.error).be.exactly('Internal Server Error');
                            should(res.body.message).be.exactly('An internal server error occurred');

                            server.stop().then(() => {

                                isPortInUse(server.hapi.info.port, (err, inUse) => {
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

    it('should register extensions', done => {
        const app = new OkanjoApp({
            webServer: {}
        });

        let loaded = 0;

        const server = new OkanjoServer(app, app.config.webServer, {
            extensions: [

                async () => {
                    loaded++;
                },

                (callback) => {
                    loaded++;
                    callback();
                },

                function (callback) {
                    loaded++;
                    callback();
                },

                new Promise((resolve/*, reject*/) => {
                    loaded++;
                    resolve();
                })
            ]
        });
        server.init().then(() => {

            loaded.should.be.exactly(4);

            isPortInUse(server.hapi.info.port, (err, inUse) => {
                should(err).not.be.ok();
                should(inUse).be.exactly(false);

                server.start().then(() => {

                    isPortInUse(server.hapi.info.port, (err, inUse) => {
                        should(err).not.be.ok();
                        should(inUse).be.exactly(true);

                        server.stop().then(() => {

                            // Anonymous function broke stop, this should check it
                            // const stopArgs = Array.prototype.slice.call(arguments);
                            // console.log(stopArgs);
                            // stopArgs.length.should.be.exactly(1);

                            isPortInUse(server.hapi.info.port, (err, inUse) => {
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
    });

});