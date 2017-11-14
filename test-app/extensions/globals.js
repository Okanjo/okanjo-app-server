/**
 * @this OkanjoServer
 * @param env
 */
module.exports = function(env) {

    env.addGlobal('env', this.app.currentEnvironment);
    env.addGlobal('pid', process.pid);

};
