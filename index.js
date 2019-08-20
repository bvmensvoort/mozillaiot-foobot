/**
 * index.js - Validates the config and loads the adapter.
 */
'use strict';

const FoobotAdapter = require('./lib/foobot-adapter');

module.exports = (addonManager, manifest, errorCallback) => {
    const config = manifest.moziot.config;

    if (!config.username) {
        errorCallback(manifest.name, 'Username must be set!');
        return;
    }

    if (!config.apikey) {
        errorCallback(manifest.name, 'API key must be set!');
        return;
    }

    if (!config.deviceIndex || !isNaN(config.deviceIndex) || config.deviceIndex < 0) {
        config.deviceIndex = 0;
    }

    new FoobotAdapter(addonManager, manifest);
};