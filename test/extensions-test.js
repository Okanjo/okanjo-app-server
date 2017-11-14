const should = require('should'),
    OkanjoApp = require('okanjo-app'),
    OkanjoServer = require('../OkanjoServer'),
    Path = require('path'),
    Needle = require('needle');


describe('JSONP Error Response Interceptor', function () {

    it('Ensure plugin works properly', function (done) {
        const app = new OkanjoApp({
                webServer: {
                    hapiConnectionOptions: {
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
            }),
            server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.jsonpResponseCodeFix
                ]
            }, function () {

                server.start(function (err) {
                    should(err).not.be.ok();


                    Needle.get('http://localhost:3000/derp?callback=_nope', function (err, res) {
                        should(err).not.be.ok();
                        res.should.be.an.Object();

                        res.body.should.be.a.String();
                        res.statusCode.should.be.equal(200);

                        //noinspection JSUnusedLocalSymbols
                        /**
                         * JSONP callback!
                         * @param data - response object
                         * @private
                         */
                        function _nope(data) {

                            should(data).be.an.Object();
                            should(data.statusCode).be.exactly(500);
                            should(data.error).be.exactly('Internal Server Error');
                            should(data.message).be.exactly('An internal server error occurred');


                            server.stop(function () {
                                done();
                            });

                        }

                        // Eval the response like JSONP does
                        eval(res.body);
                    });
                });
            });
    });


    it('handles non-boom requests with X-Original-StatusCode', function(done) {
        const app = new OkanjoApp({
                webServer: {
                    hapiConnectionOptions: {
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
            }),
            server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.jsonpResponseCodeFix
                ]
            }, function () {

                server.start(function (err) {
                    should(err).not.be.ok();


                    Needle.get('http://localhost:3000/derp/notBoom?callback=nope', function (err, res) {
                        should(err).not.be.ok();
                        res.should.be.an.Object();

                        res.statusCode.should.be.equal(200);
                        should(res.headers['x-original-statuscode']).be.exactly('500');

                        res.body.should.match(/hi/);

                        server.stop(function () {
                            done();
                        });

                    });
                });
            });
    });


    it('does nothing on non-jsonp requests', function(done) {
        const app = new OkanjoApp({
                webServer: {
                    hapiConnectionOptions: {
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
            }),
            server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.jsonpResponseCodeFix
                ]
            }, function () {

                server.start(function (err) {
                    should(err).not.be.ok();

                    Needle.get('http://localhost:3000/', function (err, res) {
                        should(err).not.be.ok();
                        res.should.be.an.Object();
                        res.statusCode.should.be.equal(200);

                        res.body.should.match(/hello world roasted default [0-9]+ yay fun roasted 1/);

                        server.stop(function () {
                            done();
                        });
                    });
                });
            });
    });

    it('replies with the correct status code on non-jsonp custom responses', function(done) {
        const app = new OkanjoApp({
                webServer: {
                    hapiConnectionOptions: {
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
            }),
            server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.jsonpResponseCodeFix
                ]
            }, function () {

                server.start(function (err) {
                    should(err).not.be.ok();

                    Needle.get('http://localhost:3000/create', function (err, res) {
                        should(err).not.be.ok();
                        res.should.be.an.Object();

                        //console.log(res.statusCode, res.body);

                        res.statusCode.should.be.equal(201);

                        res.body.statusCode.should.be.equal(201);

                        server.stop(function () {
                            done();
                        });
                    });
                });
            });
    });

    it('should redirect with jsonp enabled', function(done) {
        const app = new OkanjoApp({
                webServer: {
                    hapiConnectionOptions: {
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
            }),
            server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.jsonpResponseCodeFix
                ]
            }, function () {

                server.start(function (err) {
                    should(err).not.be.ok();

                    Needle.get('http://localhost:3000/go', function (err, res) {
                        should(err).not.be.ok();
                        res.should.be.an.Object();

                        //console.log(res.statusCode, res.body);

                        res.statusCode.should.be.equal(302);

                        //console.log(res.body);

                        server.stop(function () {
                            done();
                        });
                    });
                });
            });
    });
});


describe('Error Response Reporter', function () {

    it('reports 500 level responses', function (done) {
        const app = new OkanjoApp({
                webServer: {
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            }),
            server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.responseErrorReporter
                ]
            }, function () {

                server.start(function (err) {
                    should(err).not.be.ok();


                    Needle.get('http://localhost:3000/derp', function (err, res) {
                        should(err).not.be.ok();
                        res.should.be.an.Object();

                        should(err).not.be.ok();
                        res.should.be.an.Object();
                        res.statusCode.should.be.equal(500);

                        res.body.should.be.an.Object();
                        should(res.body.statusCode).be.exactly(500);
                        should(res.body.error).be.exactly('Internal Server Error');
                        should(res.body.message).be.exactly('An internal server error occurred');

                        server.stop(function () {
                            done();
                        });
                    });
                });
            });
    });


    it('does not report with non-boom responses', function(done) {
        const app = new OkanjoApp({
                webServer: {
                    hapiConnectionOptions: {
                        routes: {
                            cors: true
                        }
                    },
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            }),
            server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.responseErrorReporter
                ]
            }, function () {

                server.start(function (err) {
                    should(err).not.be.ok();


                    Needle.get('http://localhost:3000/derp/notBoom', function (err, res) {
                        should(err).not.be.ok();
                        res.should.be.an.Object();

                        res.statusCode.should.equal(500);
                        res.body.should.match(/hi/);

                        server.stop(function () {
                            done();
                        });

                    });
                });
            });
    });


    it('does nothing on regular non-boom response', function(done) {
        const app = new OkanjoApp({
                webServer: {
                    hapiConnectionOptions: {
                        routes: {
                            cors: true
                        }
                    },
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            }),
            server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.responseErrorReporter
                ]
            }, function () {

                server.start(function (err) {
                    should(err).not.be.ok();


                    Needle.get('http://localhost:3000/', function (err, res) {
                        should(err).not.be.ok();
                        res.should.be.an.Object();
                        res.statusCode.should.be.equal(200);

                        res.body.should.match(/hello world roasted default [0-9]+ yay fun roasted 1/);

                        server.stop(function () {
                            done();
                        });
                    });

                });
            });
    });


    it('does nothing on regular boom non-fatal response', function(done) {
        const app = new OkanjoApp({
                webServer: {
                    hapiConnectionOptions: {
                        routes: {
                            cors: true
                        }
                    },
                    routePath: Path.join(__dirname, '..', 'test-app', 'routes'),
                    viewHandlerEnabled: true,
                    viewPath: Path.join(__dirname, '..', 'test-app', 'views'),
                    nunjucksExtensionsPath: Path.join(__dirname, '..', 'test-app', 'extensions')
                }
            }),
            server = new OkanjoServer(app, app.config.webServer, {
                extensions: [
                    OkanjoServer.extensions.responseErrorReporter
                ]
            }, function () {

                server.start(function (err) {
                    should(err).not.be.ok();


                    Needle.get('http://localhost:3000/api-route-not-found', function (err, res) {
                        should(err).not.be.ok();
                        res.should.be.an.Object();
                        res.statusCode.should.be.equal(404);

                        res.body.should.be.an.Object();
                        res.body.error.should.be.equal('Not Found');


                        server.stop(function () {
                            done();
                        });
                    });

                });
            });
    });


});
