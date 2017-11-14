"use strict";

/**
 * @this OkanjoServer
 * @param env – Nunjucks environment
 */
module.exports = function(env) {

    // Remember, this.app is available here :)

    // You could add globals to Nunjucks
    env.addGlobal('env', this.app.currentEnvironment);
    env.addGlobal('pid', process.pid);

    // You could add custom filters to Nunjucks
    env.addFilter('doSomething', (str, count) => {
        // return some string
        return "yay fun " + str + " " + count;
    });

};