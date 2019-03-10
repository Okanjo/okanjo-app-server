"use strict";

/**
 * @this OkanjoServer
 */
module.exports = function() {

    //noinspection JSUnusedGlobalSymbols
    this.hapi.route({
        method: 'GET',
        path: '/deep',
        handler: function (/*request, h*/) {
            return "deeeep";
        },
        config: {
        }
    });

};