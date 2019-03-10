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
        handler: async (/*request, h*/) => {
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