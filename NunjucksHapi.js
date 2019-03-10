"use strict";

const Nunjucks = require('nunjucks');
const _defaults = require('lodash.defaults');

let wrapper = {};
let env;

// This compile has the signature that vision is expecting
wrapper.compile = function (src, options, callback) {

    // Get if compile mode is async by checking if the callback is defined
    const asyncCompileMode = (typeof callback === 'function');

    // We get the full template string from Hapi and pass it to Nunjucks
    // Nunjucks will pull in any includes and blocks itself

    const t = Nunjucks.compile(src, env);

    /* istanbul ignore if */
    if (asyncCompileMode) {

        // Render the template in the asynchronous way
        const renderer = function (context, options, next) {
            t.render(context, next);
        };

        return callback(null, renderer);

    } else {

        // Render the template in the synchronous way
        return function (context/*, options*/) {
            return t.render(context);
        };
    }
};


// We need our compiler to know about the env so we keep a reference to it

wrapper.configure = function (path, options) {
    env = Nunjucks.configure(path, options);
    return env;
};


// In all other ways be exactly the same as Nunjucks

wrapper = _defaults(wrapper, Nunjucks);

exports = module.exports = wrapper;
