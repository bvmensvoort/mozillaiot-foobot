/**
 * Foobot adapter.
 */
'use strict';

const {Adapter} = require('gateway-addon');
const FoobotDevice = require('./foobot-device');
const FoobotAPI = require('./foobot-api');
const manifest = require('../manifest.json');

/**
 * Adapter for Foobot devices.
 */
class FoobotAdapter extends Adapter {
  /**
   * Initialize the object.
   *
   * @param {Object} addonManager - AddonManagerProxy object
   * @param {Object} config - configuration options
   */
  constructor(addonManager, config) {
    super(addonManager, manifest.id, manifest.id);
    addonManager.addAdapter(this);

    this.config = config;

    this.startPairing();
  }

  /**
   * Attempt to add any configured devices.
   */
  startPairing() {
    console.log('startPairing - Nr of known devices:', this.config.foobots.length);

    // Discover new Foobots
    this.FoobotAPI = new FoobotAPI(this.config, console);
    const checkForNewDevices = new Promise((resolve) => {
      this.FoobotAPI.GetFoobotID((err, deviceinfo) => {
        if (err !== null) {
          console.error('Error getting device information: ', err);
          resolve();
          return;
        }

        if (!this.config.foobots.includes(deviceinfo)) {
          this.config.foobots.push(deviceinfo);
        }
        console.log(`Device found: ${deviceinfo.deviceuuid} (${deviceinfo.devicename})`);
        resolve();
      });
    });

    // Add all foobots saved in the config. This is prepared for support of multiple Foobots.
    checkForNewDevices.then(() => {
      for (const deviceinfo of this.config.foobots) {
        console.log(`Adding device: ${deviceinfo.deviceuuid} (${deviceinfo.devicename})`);
        const dev = new FoobotDevice(
          this,
          deviceinfo.deviceuuid,
          deviceinfo
        );
        dev.promise.then(() => this.handleDeviceAdded(dev));
      }
    });
  }

  /**
   * Remove a device from this adapter.
   *
   * @param {Object} device - The device to remove
   * @returns {Promise} Promise which resolves to the removed device.
   */
  removeThing(device) {
    if (this.devices.hasOwnProperty(device.id)) {
      this.handleDeviceRemoved(device);
    }

    return Promise.resolve(device);
  }
}

module.exports = FoobotAdapter;
