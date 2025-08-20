/* eslint-env node */
const { setGlobalOptions } = require("firebase-functions");

// keep resource usage low; this codebase exports nothing
setGlobalOptions({ maxInstances: 1 });

module.exports = {};


