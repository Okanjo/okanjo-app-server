/**
 * @this OkanjoServer
 */
module.exports = function() {

    //noinspection JSUnusedGlobalSymbols
    this.hapi.route({
        method: 'GET',
        path: '/',
        handler: function (request, reply) {

            reply.view('home.j2', {
                boom: "roasted"
            });

        },
        config: {
        }
    });


};