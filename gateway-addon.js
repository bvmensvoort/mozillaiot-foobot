module.exports = {
  Adapter: class Adapter {
    constructor() {
      this.config = {};
    }

    addAdapter() {}

    handleDeviceAdded() {}
  },
  Device: class Device {
    constructor() {
      this.properties = new Map();
    }

    notifyPropertyChanged() {}
  },
  Property: class Property {
    setCachedValue() {}
  },
};
