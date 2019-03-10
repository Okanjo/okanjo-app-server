"use strict";

/**
 * @this OkanjoServer
 */
module.exports = function() {

    //noinspection JSUnusedGlobalSymbols
    this.hapi.route({
        method: 'GET',
        path: '/',
        handler: async (request, h) => {

            return h.view('home.j2', {
                boom: "roasted"
            });

        },
        config: {
        }
    });

};