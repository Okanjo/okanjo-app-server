"use strict";

/**
 * @this OkanjoServer
 */
module.exports = function() {

    // Remember, this.app is available here :)

    // This route replies with a rendered view using the example.j2 template and given context
    this.hapi.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {
            reply.view('example.j2', {
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
        handler: function (request, reply) {
            pretendServiceFunction((err, res) => {          // Fire off a pretend service function
                this.app.ifOk(err, reply, () => {           // If the function failed, reply negatively
                    reply(this.app.response.ok(), res);     // Otherwise, since everything was good, reply positively
                });
            });
        },
        config: {
            // ... validation, authentication. tagging, etc
        }
    });

    /**
     * Pretend service function that can callback with a response or an error
     */
    const pretendServiceFunction = (callback) => {
        if (Math.random() > 0.50) { // half the time, return an error
            callback(this.app.response.badRequest('Nope, not ready yet.'));
        } else {
            callback(null, { all: 'good' });
        }
    };

};