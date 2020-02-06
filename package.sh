#!/bin/bash
echo "-- Resetting environment"
rm -rf node_modules
rm -f SHA256SUMS package-lock.json *.tgz

echo "-- Installing dependencies and creating package-lock"
npm install --production --package-lock

echo "-- Generate SHA256 checksums"
sha256sum manifest.json package.json index.js lib/*.js LICENSE README.md > SHA256SUMS
rm -rf node_modules/.bin
find node_modules -type f -exec sha256sum {} \; >> SHA256SUMS

echo "-- Pack to tar archive"
TARFILE=$(npm pack)

echo "-- Add dependent node_modules to archive"
tar --extract --ungzip --file=${TARFILE}
cp -r node_modules ./package
tar --create --gzip --file=${TARFILE} ./package
rm -rf package

echo "-- Show SHA265 checksum of package"
sha256sum *.tgz
