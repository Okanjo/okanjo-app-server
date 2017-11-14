/**
 * @this OkanjoServer
 * @param callback
 */
module.exports = function(callback) {

    // Fudge JSONP responses to always come back 200, cuz browsers eat them otherwise #OMNOMNOMNOM
    this.hapi.ext('onPreResponse', (request, reply) => {

        // If this is a JSONP request, fudge the HTTP status code but preserve it in the body of the response
        if (request.jsonp) {
            if (request.response.isBoom) {
                request.response.output.statusCode = 200;
            } else {
                // This might need to change if the response is totally custom like a string or something
                request.response.header('X-Original-StatusCode', request.response.statusCode);
                request.response.statusCode = 200;
            }
        } else {

            // Make sure the statusCode in the body matches the statusCode of the response
            // For example, reply(app.response.created()) would have a statusCode of 201 but response code of 200
            if (request.response.source &&
                typeof request.response.source === "object" &&
                typeof request.response.source.statusCode === "number" &&
                request.response.source.statusCode !== request.response.statusCode) {
                request.response.statusCode = request.response.source.statusCode;
            }
        }

        return reply.continue();

    });

    callback();
};