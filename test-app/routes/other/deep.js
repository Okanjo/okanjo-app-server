/**
 * @this OkanjoServer
 */
module.exports = function() {

    //noinspection JSUnusedGlobalSymbols
    this.hapi.route({
        method: 'GET',
        path: '/deep',
        handler: function (request, reply) {

            reply("deeeep");

        },
        config: {
        }
    });


};