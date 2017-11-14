/**
 * @this OkanjoServer
 */
module.exports = function() {

    //noinspection JSUnusedGlobalSymbols
    this.hapi.route({
        method: 'GET',
        path: '/create',
        handler: (function (request, reply) {

            reply(this.app.response.created('Poop'));

        }).bind(this),
        config: {
        }
    });


    //noinspection JSUnusedGlobalSymbols
    this.hapi.route({
        method: 'GET',
        path: '/go',
        handler: (function (request, reply) {

            reply.redirect('/create');

        }).bind(this),
        config: {
        }
    });

};