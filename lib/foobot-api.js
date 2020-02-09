const request = require('request');
const Characteristic = {
  AirQuality: {
    POOR: 'Poor',
    INFERIOR: 'Inferior',
    FAIR: 'Fair',
    GOOD: 'Good',
    EXCELLENT: 'Excellent',
  },
};

class Foobot {
  constructor(config, logService) {
    Object.assign(this, config, logService);

    this.foobotDeviceIndex = config.deviceIndex || 0;   // Only used in GetFooBotID to get correct FoobotID, possible to set manually in config
    this.deviceuuid = config.deviceuuid || undefined;
    this.devicename = config.devicename || undefined;   // Usage is unknown
    if (this.deviceuuid) {
      this.havedeviceID = true;   // Only used in GetFooBotID to prevent multiple lookups
    }

    // About caching
    this.lastSensorRefresh = undefined;
    this.measurements = undefined;
    this.authtoken = undefined;
    this.lastHistoricalRefresh = undefined;
    this.historicalmeasurements = [];

    // About logging
    this.log = logService;
    this.loggingService = {
      addEntry: function() {},
    };
    this.logTempToFile = false;           // Unsupported
    this.logTempToFilePath = undefined;   // Unsupported
  }

  getAllState() {
    if (this.deviceuuid !== 'undefined') {
      this.getLatestValues(function() { });
    } else {
      this.log.debug('Foobot devices not found for this username.');
    }
  }

  httpRequest(options, callback) {
    request(options,
            function(error, response, body) {
              this.log.debug('Polled API:', options.url, options.json);
              callback(error, response, body);
            }.bind(this));
  }

  login(callback) {
    if (this.loggedin != 1) {
      const options = {
        url: `https://api.foobot.io/v2/user/${this.username}/login/`,
        method: 'get',
        headers: {
          'X-API-KEY-TOKEN': this.apikey,
        },
      };
        // Send request
      this.httpRequest(options, function(error, response) {
        if (error) {
          this.log.debug('HTTP function failed: %s', error);
          callback(error);
        } else {
          this.loggedin = 1;
          this.log.debug('Logged in to API');
          this.authtoken = response.headers['x-auth-token'];
          callback(null);
        }
      }.bind(this));
    } else {
      this.log.debug('Already logged in');
      callback(null);
    }
  }

  GetFoobotID(callback) {
    if (!this.havedeviceID) {
      // Build request and get UUID
      this.login(function() {
        const options = {
          url: `https://api.foobot.io/v2/owner/${this.username}/device/`,
          method: 'get',
          headers: {
            'X-API-KEY-TOKEN': this.apikey,
            'X-AUTH-TOKEN': this.authtoken,
          },
        };
          // Send request
        this.httpRequest(options, function(error, response, body) {
          if (error || response.statusCode !== 200) {
            this.log.debug('HTTP function failed: %s', error);
            callback(error);
          } else {
            const json = JSON.parse(body);
            const quotaReached = JSON.stringify(json).includes('quota exceeded') ? true : false;
            if (quotaReached) {
              this.log.debug('\x1b[36m%s\x1b[0m', 'Foobot specified is higher than number of foobot devices available, or API quota exceeded');
              this.havedeviceID = false;
            } else if (this.foobotDeviceIndex < json.length) {
              this.deviceuuid = json[this.foobotDeviceIndex].uuid;
              this.devicename = json[this.foobotDeviceIndex].name;
              this.havedeviceID = true;
              this.log.debug('Got device ID');
            }
            callback(null, {deviceuuid: this.deviceuuid, devicename: this.devicename});
          }
        }.bind(this));
      }.bind(this));
    } else {
      this.log.debug('Already have device ID');
      callback(null, {deviceuuid: this.deviceuuid, devicename: this.devicename});
    }
  }

  getLatestValues(callback) {
    // Get time now and check if we pulled from API in the last 5 minutes
    // if so, don't refresh as this is the max resolution of API
    const time = new Date();
    time.setMinutes(time.getMinutes() - 5);
    if (this.deviceuuid !== 'undefined') {
      if (typeof this.lastSensorRefresh !== 'undefined' || typeof this.measurements == 'undefined') {
        if (time > this.lastSensorRefresh || typeof this.measurements == 'undefined') {
          // Build the request and use returned value
          this.GetFoobotID(function() {
            const options = {
              url: `https://api.foobot.io/v2/device/${this.deviceuuid}/datapoint/0/last/0/`,
              method: 'get',
              headers: {
                'X-API-KEY-TOKEN': this.apikey,
                'X-AUTH-TOKEN': this.authtoken, // TODO: Explore API usage without AUTH token. Not required with CURL. Less API calls if we remove login calls
              },
            };
              // Send request
            this.httpRequest(options, function(error, response, body) {
              if (error) {
                this.log.error('HTTP function failed: %s', error);
                this.log.error('Continuing to prevent homebridge fail.');
                // callback(error);
                callback(null);
              } else {
                this.measurements = {};
                const json = JSON.parse(body);
                this.lastSensorRefresh = new Date();

                const invalidKey = JSON.stringify(json).includes('invalid key') ? true : false;
                if (invalidKey) {
                  this.log.error('\x1b[36m%s\x1b[0m', 'API key invalid');
                }


                const quotaReached = JSON.stringify(json).includes('quota exceeded') ? true : false;
                if (quotaReached) {
                  this.log.error('\x1b[36m%s\x1b[0m', 'Quota exceeded, consider refreshing less often');
                  this.log.error('\x1b[36m%s\x1b[0m', 'Setting Sensors to 0 to continue bridge operation.');
                }

                const noDataPoints = (json.datapoints === 'undefined');
                if (noDataPoints) {
                  this.log.error('\x1b[36m%s\x1b[0m', 'No datapoints in the response');
                }

                if (invalidKey || quotaReached || noDataPoints) {
                  this.measurements.pm = '0';
                  this.measurements.tmp = '0';
                  this.measurements.hum = '0';
                  this.measurements.co2 = '0';
                  this.measurements.airquality = 'No data';
                  this.measurements.airqualityppm = '0';
                  this.measurements.voc = '0';
                  this.measurements.allpollu = '0';
                } else if (json.datapoints.length >= 1) {
                  const co2Levels = [
                    [99999, 2101, Characteristic.AirQuality.POOR],
                    [2100, 1601, Characteristic.AirQuality.INFERIOR],
                    [1600, 1101, Characteristic.AirQuality.FAIR],
                    [1100, 701, Characteristic.AirQuality.GOOD],
                    [700, 0, Characteristic.AirQuality.EXCELLENT],
                  ];
                  const allPollutionLevels = [
                    [100, 91, Characteristic.AirQuality.POOR],
                    [90, 71, Characteristic.AirQuality.INFERIOR],
                    [70, 51, Characteristic.AirQuality.FAIR],
                    [50, 26, Characteristic.AirQuality.GOOD],
                    [25, 0, Characteristic.AirQuality.EXCELLENT],
                  ];
                  // console.log(json.datapoints);
                  for (let i = 0; i < json.sensors.length; i++) {
                    switch (json.sensors[i]) {
                      case 'pm':
                        this.measurements.pm = json.datapoints[0][i];
                        // this.log.debug("Particulate matter 2.5:", this.measurements.pm + " " + json.units[i]);
                        break;

                      case 'tmp':
                        this.measurements.tmp = json.datapoints[0][i];
                        // this.log.debug("Temperature:", this.measurements.tmp + " " + json.units[i]);
                        break;

                      case 'hum':
                        this.measurements.hum = json.datapoints[0][i];
                        // this.log.debug("Humidity:", this.measurements.hum + " " + json.units[i]);
                        break;

                      case 'co2':
                        this.measurements.co2 = json.datapoints[0][i];
                        // this.log.debug("CO2:", this.measurements.co2 + " " + json.units[i]);
                        for (const item of co2Levels) {
                          if (json.datapoints[0][i] >= item[1] && json.datapoints[0][i] <= item[0]) {
                            this.measurements.airqualityppm = item[2];
                          }
                        }
                        break;

                      case 'voc':
                        this.measurements.voc = json.datapoints[0][i];
                        // this.log.debug("Volatile organic compounds:", this.measurements.voc + " " + json.units[i]);
                        break;

                      case 'allpollu':
                        this.measurements.allpollu = json.datapoints[0][i];
                        // console.log("All Pollution:", this.measurements.allpollu, json.units[i]);
                        for (const item of allPollutionLevels) {
                          if (json.datapoints[0][i] > item[1] && json.datapoints[0][i] <= item[0]) {
                            this.measurements.airquality = item[2];
                          }
                        }
                        // console.log("Air Quality:", this.measurements.airquality);
                        break;

                      default:
                        break;
                    }
                  }
                  // console.log(this.measurements);

                  // Fakegato-history add data point
                  // temperature, humidity and air quality
                  // Air Quality measured here as CO2 ppm
                  if (this.getHistoricalStats) {
                    // Untested:
                    // this.loggingService.addEntry({
                    //   time: moment().unix(),
                    //   temp: this.measurements.tmp,
                    //   humidity: this.measurements.hum,
                    //   ppm: this.measurements.co2,
                    // });
                  }
                  if (this.logTempToFile && this.logTempToFilePath !== 'undefined') {
                    // Untested:
                    // fs1.writeFile(String(this.logTempToFilePath), String(this.measurements.tmp), function(err) {
                    //   if (err) {
                    //     return console.log(err);
                    //   }
                    // });
                  }
                  this.log.debug('Sensor data refreshed');
                } else {
                  this.log.debug('No sensor data available');
                }
                callback(null);
              }
            }.bind(this));
          }.bind(this));
        } else {
          this.log.debug('Sensor data polled in last 5 minutes, waiting.');
          callback(null);
        }
      }
    } else {
      this.log.debug('No Foobot devices for this account found');
    }
  }

  getHistoricalValues(callback) {
    // Get time now and check if we pulled from API in the last 30 minutes
    // if so, don't refresh as this is the max resolution of API
    const time = new Date();
    time.setMinutes(time.getMinutes() - 30);
    if (this.deviceuuid !== 'undefined') {
      if (typeof this.lastHistoricalRefresh !== 'undefined' || typeof this.historicalmeasurements[0] == 'undefined') {
        if (time > this.lastHistoricalRefresh || typeof this.historicalmeasurements[0] == 'undefined') {
          // Build the request and use returned value
          this.GetFoobotID(function() {
            const timenow = new Date();
            const timelastmonth = new Date();
            timelastmonth.setMonth(timelastmonth.getMonth() - 1);
            const tsnow = timenow.toISOString();
            const tslastmonth = timelastmonth.toISOString();
            const options = {
              // Get datapoints rounded to 600s as higher resolution reduces history in Eve
              url: `https://api.foobot.io/v2/device/${this.deviceuuid}/datapoint/${tslastmonth}/${tsnow}/600/`,
              method: 'get',
              headers: {
                'X-API-KEY-TOKEN': this.apikey,
                'X-AUTH-TOKEN': this.authtoken,
              },
            };
              // Send request
            this.httpRequest(options, function(error, response, body) {
              if (error) {
                this.log.debug('HTTP function failed: %s', error);
                callback(error);
              } else {
                const json = JSON.parse(body);

                const quotaReached = JSON.stringify(json).includes('quota exceeded') ? true : false;
                if (quotaReached) {
                  this.log.debug('\x1b[43m', 'Quota exceeded, consider adding refreshing less often');
                  this.log.debug('\x1b[43m', 'History not refreshed');
                  callback(null);
                } else if ((json.datapoints.length >= 1)) {
                  this.log.debug(`Downloaded ${json.datapoints.length} datapoints for ${json.sensors.length} senors`);
                  for (let i = 0; i < json.sensors.length; i++) {
                    this.historicalmeasurements.push([]);
                    switch (json.sensors[i]) {
                      case 'time':
                        for (let j = 0; j < json.datapoints.length; j++) {
                          this.historicalmeasurements[i][j] = json.datapoints[j][i];
                        }
                        break;

                      case 'pm':
                        for (let j = 0; j < json.datapoints.length; j++) {
                          this.historicalmeasurements[i][j] = json.datapoints[j][i];
                        }
                        break;

                      case 'tmp':
                        for (let j = 0; j < json.datapoints.length; j++) {
                          this.historicalmeasurements[i][j] = json.datapoints[j][i];
                        }
                        break;

                      case 'hum':
                        for (let j = 0; j < json.datapoints.length; j++) {
                          this.historicalmeasurements[i][j] = json.datapoints[j][i];
                        }
                        break;

                      case 'co2':
                        for (let j = 0; j < json.datapoints.length; j++) {
                          this.historicalmeasurements[i][j] = json.datapoints[j][i];
                        }
                        break;

                      case 'voc':
                        for (let j = 0; j < json.datapoints.length; j++) {
                          this.historicalmeasurements[i][j] = json.datapoints[j][i];
                        }
                        break;

                      case 'allpollu':
                        for (let j = 0; j < json.datapoints.length; j++) {
                          this.historicalmeasurements[i][j] = json.datapoints[j][i];
                        }
                        break;

                      default:
                        break;
                    }
                  }
                  this.lastHistoricalRefresh = new Date();
                }
                callback(null);
              }
            }.bind(this));
          }.bind(this));
        }
      } else {
        this.log.debug('Pulled historical data in last 30 mins, waiting');
        callback();
      }
    } else {
      this.log.debug('No Foobot devices found');
    }
  }

  getAirQuality(callback) {
    this.getLatestValues(function() {
      callback(null, this.measurements.airquality);
    }.bind(this));
  }

  getPM25Density(callback) {
    this.getLatestValues(function() {
      callback(null, this.measurements.pm);
    }.bind(this));
  }

  getVOCDensity(callback) {
    this.getLatestValues(function() {
      callback(null, this.measurements.voc);
    }.bind(this));
  }

  getTemperature(callback) {
    this.getLatestValues(function() {
      callback(null, this.measurements.tmp);
    }.bind(this));
  }

  getHumidity(callback) {
    this.getLatestValues(function() {
      callback(null, this.measurements.hum);
    }.bind(this));
  }

  getCO2(callback) {
    this.getLatestValues(function() {
      callback(null, this.measurements.co2);
    }.bind(this));
  }

  getCO2Peak(callback) {
    this.getHistoricalValues(function() {
      const peakCO2 = Math.max(...this.historicalmeasurements[4]);
      callback(null, peakCO2);
    }.bind(this));
  }

  getCO2Detected(callback) {
    this.getLatestValues(function() {
      if (this.measurements.co2 <= 2000) {
        callback(null, 0);
      } else {
        callback(null, 1);
      }
    }.bind(this));
  }
}

module.exports = Foobot;
