/**
 * @this OkanjoServer
 * @param env
 */
module.exports = function(env) {

    env.addFilter('doSomething', function (str, count) {
        // return some string
        return "yay fun " + str + " " + count;
    });

};