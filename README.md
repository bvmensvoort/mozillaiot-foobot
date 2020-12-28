[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/bvmensvoort/mozillaiot-foobot)
[![HitCount](http://hits.dwyl.io/bvmensvoort/mozillaiot-foobot.svg)](http://hits.dwyl.io/bvmensvoort/mozillaiot-foobot)
[![GitHub last commit](https://img.shields.io/github/last-commit/bvmensvoort/mozillaiot-foobot.svg)](https://github.com/bvmensvoort/mozillaiot-foobot)

# mozillaiot-foobot
This is a [WebThings Gateway](https://webthings.io/gateway) plugin which lets you integrate your [Foobot](https://foobot.io) air quality monitor into WebThings. 

## First things first - Thanks to:

This plugin is heavily based on [homebridge-foobot](https://github.com/gchokov/homebridge-foobot) plugin and the [weather-adapter](https://github.com/WebThingsIO/weather-adapter) plugin. Without it, this plugin won't be here now. Thank you **@gchokov** for the inspiration and work on the homebridge and Foobot api integration!
Which in turn was inspired by the work of **@mylesgray**.

Thanks!

# What is Foobot?

Foobot is an awesome little indoor quality monitor gadget by Airboxlab, that I use for years now. Not really sure if official WebThings support will ever be announced. But important to give WebThings a try. And possibly help other owners of a Foobot.

# General info
This plugin supports one device per API account. This adapter supports some of the properties the Foobot API offers (Air Quality, Temperature, Humidity, Volatile Compounds, Particulate Matter and CO2 levels). It updates every 15 minutes.

## Configuration

### Installation

* Add Foobot adapter to your Add Ons (via settings, add-ons, look for something with 'Foobot').
* Configure the plugin and enter
  - a username
  - an API key (Obtain it from [Foobot API for Developers page](https://api.foobot.io/apidoc/index.html), and use the 'secret'-code)
  - *deviceIndex* - allows you to work with specific Foobot devices, in case you have several foobots. (0: your first device, 1: your second, etc.)
* Goto Things (via menu) and click add. Your Foobot should show up.
