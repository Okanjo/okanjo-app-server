"use strict";

const should = require('should');
const OkanjoApp = require('okanjo-app');
const OkanjoServer = require('../OkanjoServer');
const Path = require('path');
const Needle = require('needle');


describe('JSONP Error Response Interceptor', () => {

    it('Ensure plugin works properly', async () => {

        const app = new OkanjoApp({
                webServer: {
                    hapiServerOptions: {
                        routes: {
                            cors: true,
                            jsonp: 'callback'
                        }
                    },
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            });
        const server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.jsonpResponseCodeFix
                ]
            });

        await server.start();

        const res = await Needle('get', `http://localhost:${server.hapi.info.port}/derp?callback=_nope`);
        res.should.be.an.Object();

        res.body.should.be.a.String();
        res.statusCode.should.be.equal(200);

        let jsonpCallbackFired = false;

        //noinspection JSUnusedLocalSymbols
        /**
         * JSONP callback!
         * @param data - response object
         * @private
         */
        function _nope(data) { // eslint-disable-line no-unused-vars

            should(data).be.an.Object();
            should(data.statusCode).be.exactly(500);
            should(data.error).be.exactly('Internal Server Error');
            should(data.message).be.exactly('An internal server error occurred');

            jsonpCallbackFired = true;
        }

        // Eval the response like JSONP does
        eval(res.body);

        // our callback shoulda fired
        should(jsonpCallbackFired).be.exactly(true);

        // Done
        await server.stop();
    });

    it('handles non-boom requests with X-Original-StatusCode', async () => {

        const app = new OkanjoApp({
            webServer: {
                hapiServerOptions: {
                    routes: {
                        cors: true,
                        jsonp: 'callback'
                    }
                },
                routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                viewHandlerEnabled: true,
                viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
            }
        });

        const server = new OkanjoServer(app, app.config.webServer, {
            extensions: [
                OkanjoServer.extensions.jsonpResponseCodeFix
            ]
        });

        await server.start();


        const res = await Needle('get', `http://localhost:${server.hapi.info.port}/derp/notBoom?callback=nope`);
        res.should.be.an.Object();

        res.statusCode.should.be.equal(200);
        should(res.headers['x-original-statuscode']).be.exactly('500');

        res.body.should.match(/hi/);

        await server.stop();
    });

    it('does nothing on non-jsonp requests', async () => {
        const app = new OkanjoApp({
                webServer: {
                    hapiServerOptions: {
                        routes: {
                            cors: true,
                            jsonp: 'callback'
                        }
                    },
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            });
        const server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.jsonpResponseCodeFix
                ]
            });

        await server.start();

        const res = await Needle('get', `http://localhost:${server.hapi.info.port}/`);
        res.should.be.an.Object();
        res.statusCode.should.be.equal(200);

        res.body.should.match(/hello world roasted default [0-9]+ yay fun roasted 1/);

        await server.stop();
    });

    it('replies with the correct status code on non-jsonp custom responses', async () => {
        const app = new OkanjoApp({
                webServer: {
                    hapiServerOptions: {
                        routes: {
                            cors: true,
                            jsonp: 'callback'
                        }
                    },
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            });
        const server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.jsonpResponseCodeFix
                ]
            })
        ;

        await server.start();

        const res = await Needle('get', `http://localhost:${server.hapi.info.port}/create`);
        res.should.be.an.Object();

        //console.log(res.statusCode, res.body);

        res.statusCode.should.be.equal(201);

        res.body.statusCode.should.be.equal(201);

        await server.stop();
    });

    it('should redirect with jsonp enabled', async () => {
        const app = new OkanjoApp({
                webServer: {
                    hapiServerOptions: {
                        routes: {
                            cors: true,
                            jsonp: 'callback'
                        }
                    },
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            });
        const server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.jsonpResponseCodeFix
                ]
            })
        ;

        await server.start();

        const res = await Needle('get', `http://localhost:${server.hapi.info.port}/go`);
        res.should.be.an.Object();

        //console.log(res.statusCode, res.body);

        res.statusCode.should.be.equal(302);

        //console.log(res.body);

        await server.stop();
    });
});


describe('Error Response Reporter', () => {

    it('reports 500 level responses', async () => {
        const app = new OkanjoApp({
                webServer: {
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            });
        const server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.responseErrorReporter
                ]
            })
        ;

        await server.start();

        const res = await Needle('get', `http://localhost:${server.hapi.info.port}/derp`);
        res.should.be.an.Object();

        res.statusCode.should.be.equal(500);

        res.body.should.be.an.Object();
        should(res.body.statusCode).be.exactly(500);
        should(res.body.error).be.exactly('Internal Server Error');
        should(res.body.message).be.exactly('An internal server error occurred');

        await server.stop();
    });

    it('does not report with non-boom responses', async () => {
        const app = new OkanjoApp({
                webServer: {
                    hapiServerOptions: {
                        routes: {
                            cors: true
                        }
                    },
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            })
        ;

        const server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.responseErrorReporter
                ]
            })
        ;

        await server.start();

        const res = await Needle('get', `http://localhost:${server.hapi.info.port}/derp/notBoom`);
        res.should.be.an.Object();

        res.statusCode.should.equal(500);
        res.body.should.match(/hi/);

        await server.stop();
    });

    it('does nothing on regular non-boom response', async () => {
        const app = new OkanjoApp({
                webServer: {
                    hapiServerOptions: {
                        routes: {
                            cors: true
                        }
                    },
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            });
        const server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.responseErrorReporter
                ]
            })
        ;

        await server.start();

        const res = await Needle('get', `http://localhost:${server.hapi.info.port}/`);
        res.should.be.an.Object();
        res.statusCode.should.be.equal(200);

        res.body.should.match(/hello world roasted default [0-9]+ yay fun roasted 1/);

        await server.stop();
    });

    it('does nothing on regular boom non-fatal response', async () => {
        const app = new OkanjoApp({
                webServer: {
                    hapiServerOptions: {
                        routes: {
                            cors: true
                        }
                    },
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            });
        const server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.responseErrorReporter
                ]
            })
        ;

        await server.start();

        const res = await Needle('get', `http://localhost:${server.hapi.info.port}/api-route-not-found`);
        res.should.be.an.Object();
        res.statusCode.should.be.equal(404);

        res.body.should.be.an.Object();
        res.body.error.should.be.equal('Not Found');

        await server.stop();
    });

});
