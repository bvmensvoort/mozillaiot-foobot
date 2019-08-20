#!/bin/bash

rm -f SHA256SUMS package-lock.json
npm install --production --package-lock
sha256sum package.json *.js lib/*.js LICENSE > SHA256SUMS
npm pack
