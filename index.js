/**
* index.js - Validates the config and loads the adapter.
*/
'use strict';

const {Database} = require('gateway-addon');
const FoobotAdapter = require('./lib/foobot-adapter');
const manifest = require('./manifest.json');

module.exports = (addonManager, _, errorCallback) => {
  const db = new Database(manifest.id);
  db.open().then(() => {
    return db.loadConfig();
  }).then((config) => {
    if (!config.username) {
      errorCallback(manifest.id, 'Username must be set!');
      return;
    }

    if (!config.apikey) {
      errorCallback(manifest.id, 'API key must be set!');
      return;
    }

    if (!config.deviceIndex || !isNaN(config.deviceIndex) ||
        config.deviceIndex < 0) {
      config.deviceIndex = 0;
    }

    new FoobotAdapter(addonManager, config);
  }).catch((e) => {
    errorCallback(manifest.id, `Failed to open database: ${e}`);
  });
};
