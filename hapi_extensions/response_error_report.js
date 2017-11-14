/**
 * @this OkanjoServer
 * @param callback
 */
module.exports = function(callback) {

    // Anytime the server returns a 500-level response, tell us about it. We should never return a 500 because something went horribly wrong.
    this.hapi.ext('onPreResponse', (request, reply) => {

        // If the response is a legit response object and the status code is something we screwed up, report it
        if (request.response.isBoom) {
            if (request.response.output.statusCode >= 500) {
                this.app.report(new Error(request.response.output.statusCode + ' Response Returned to Client'), {
                    request: {
                        credentials: request.credentials,
                        headers: request.headers,
                        info: request.info,
                        params: request.params,
                        payload: request.payload,
                        query: request.query,
                        route: {
                            method: request.route.method,
                            path: request.route.path
                        }
                    },
                    milliseconds: (new Date()).getTime() - request.info.received,
                    response: request.response,
                    source: "onPreResponse"
                });
            }
        }

        return reply.continue();

    });

    callback();
};