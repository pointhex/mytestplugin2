const https = require('https');
const fs = require('fs');
const { URL } = require('url');
const { downloadPackage } = require('./utils');

const baseUrls = [
    'https://download.qt.io/official_releases/qtcreator/',
    'https://download.qt.io/snapshots/qtcreator/'
];

const version = process.argv[2];
const platform = process.argv[3];

// Extract the major and minor versions
const [major, minor] = version.split('.').slice(0, 2);
const folderPath = `${major}.${minor}/${version}/`;

const urlBase = baseUrls[0] + folderPath + 'installer_source/' + platform + '/';
const urlSnapshot = baseUrls[1] + folderPath + 'installer_source/latest/' + platform + '/';

async function downloadQtC() {
    for (const url of [urlBase, urlSnapshot]) {
        try {
            console.log(`Downloading from ${url}`);
            for (const packageName of ['qtcreator.7z', 'qtcreator_dev.7z']) {
                await downloadPackage(url, packageName);
            }
            return '';
        } catch (error) {
            console.error(`Failed to download from ${url}:`, error);
        }
    }

    console.error('Failed to download Qt Creator packages');
    process.exit(1);
}

downloadQtC();