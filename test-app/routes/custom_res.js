"use strict";

/**
 * @this OkanjoServer
 */
module.exports = function() {

    //noinspection JSUnusedGlobalSymbols
    this.hapi.route({
        method: 'GET',
        path: '/create',
        handler: async (/*request, h*/) => {
            return this.app.response.created('Poop');
        },
        config: {
        }
    });


    //noinspection JSUnusedGlobalSymbols
    this.hapi.route({
        method: 'GET',
        path: '/go',
        handler: async (request, h) => {
            return h.redirect('/create');
        },
        config: {
        }
    });

};