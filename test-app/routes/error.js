/**
 * @this OkanjoServer
 */
module.exports = function() {

    //noinspection JSUnusedGlobalSymbols
    this.hapi.route({
        method: 'GET',
        path: '/derp',
        handler: (function (request, reply) {

            reply(this.app.response.badImplementation('Whoops', 'Derp on me'));

        }).bind(this),
        config: {
        }
    });


    //noinspection JSUnusedGlobalSymbols
    this.hapi.route({
        method: 'GET',
        path: '/derp/notBoom',
        handler: (function (request, reply) {

            reply("hi")
                .code(500);

        }).bind(this),
        config: {
        }
    });

};