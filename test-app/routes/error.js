"use strict";

/**
 * @this OkanjoServer
 */
module.exports = function() {

    //noinspection JSUnusedGlobalSymbols
    this.hapi.route({
        method: 'GET',
        path: '/derp',
        handler: async (/*request, h*/) => {
            return this.app.response.badImplementation('Whoops', 'Derp on me');
        },
        config: {
        }
    });


    //noinspection JSUnusedGlobalSymbols
    this.hapi.route({
        method: 'GET',
        path: '/derp/notBoom',
        handler: async (request, h) => {
            return h.response("hi")
                .code(500);
        },
        config: {
        }
    });

};