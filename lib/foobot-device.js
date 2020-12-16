/**
* Foobot device
*/
'use strict';

const {Device} = require('gateway-addon');
const FoobotProperty = require('./foobot-property');
const FoobotAPI = require('./foobot-api');

/**
* Foobot device.
*/
class FoobotDevice extends Device {
  /**
  * Initialize the object.
  *
  * @param {Object} adapter - WeatherAdapter instance
  * @param {string} uuid - Configured uuid
  * @param {Object} deviceinfo - Info about the device (uuid, name)
  */
  constructor(adapter, uuid, deviceinfo) {
    super(adapter, uuid);

    const pollInterval = 15; // 15 minutes to refresh

    const apiconfig = Object.assign(deviceinfo, adapter.config);

    this.FoobotAPI = new FoobotAPI(apiconfig, console);

    this.properties.set(
      'AirQuality',
      new FoobotProperty(
        this,
        'Air quality', // AirQuality description
        {
          label: 'Air quality',
          type: 'string',
          readOnly: true,
        },
        null
      )
    );

    this.properties.set(
      'Temperature',
      new FoobotProperty(
        this,
        'Temperature', // Temperature description
        {
          label: 'Temperature',
          '@type': 'TemperatureProperty',
          type: 'integer',
          unit: 'degree celsius',
          readOnly: true,
        },
        null
      )
    );

    this.properties.set(
      'Humidity',
      new FoobotProperty(
        this,
        'Humidity', // Humidity description
        {
          label: 'Humidity',
          '@type': 'LevelProperty',
          type: 'integer',
          unit: 'percent',
          minimum: 0,
          maximum: 100,
          readOnly: true,
        },
        null
      )
    );

    this.properties.set(
      'VOCDensity',
      new FoobotProperty(
        this,
        'Volatile compounds', // Volatile compounds description
        {
          label: 'Volatile compounds',
          '@type': 'LevelProperty',
          type: 'integer',
          unit: 'ppb',
          minimum: 0,
          readOnly: true,
        },
        null
      )
    );

    this.properties.set(
      'CO2',
      new FoobotProperty(
        this,
        'CO2 level', // CO2 level description
        {
          label: 'CO2 level',
          '@type': 'LevelProperty',
          type: 'integer',
          unit: 'percent',
          minimum: 0,
          readOnly: true,
        },
        null
      )
    );

    this.properties.set(
      'PM25Density',
      new FoobotProperty(
        this,
        'Particulate matter density', // Particulate matter 2.5 density description
        {
          label: 'Particulate matter density',
          '@type': 'LevelProperty',
          type: 'integer',
          unit: 'uG/m3',
          minimum: 0,
          readOnly: true,
        },
        null
      )
    );

    this.name = this.description = deviceinfo.devicename || 'Foobot';
    this['@context'] = 'https://webthings.io/schemas';
    this['@type'] = ['MultiLevelSensor'];
    this.pollInterval = pollInterval * 60 * 1000;

    this.promise = this.poll();
  }

  /**
  * Update the Foobot data.
  */
  poll() {
    const promise = new Promise((resolve) => {
      this.FoobotAPI.getLatestValues(() => {
        resolve();
      });
    });

    promise.then(() => {
      const propertynames = [
        'Temperature',
        'AirQuality',
        'PM25Density',
        'VOCDensity',
        'Humidity',
        'CO2',

        // To be added later
        // 'CO2Peak',
        // 'CO2Detected'
      ];

      const promises = propertynames.map((propertyname) => {
        return new Promise((resolve, reject) => {
          this.FoobotAPI[`get${propertyname}`]((err, value) => {
            if (err) {
              reject(err); return;
            }

            const prop = this.properties.get(propertyname);
            if (prop.value !== value) {
              prop.setCachedValue(value);
              this.notifyPropertyChanged(prop);
            }
            resolve();
          });
        });
      });

      return Promise.all(promises);
    }).catch((e) => {
      console.error('Failed to poll Foobot API:', e);
    });

    setTimeout(this.poll.bind(this), this.pollInterval);
    return promise;
  }
}

module.exports = FoobotDevice;
