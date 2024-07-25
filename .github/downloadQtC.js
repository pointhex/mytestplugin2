const https = require('https');
const fs = require('fs');
const { URL } = require('url');
const { downloadPackage } = require('./utils');

const version = process.argv[2];
const platform = process.argv[3];

async function checkQtCreatorFolder(version) {
    const baseUrls = [
        'https://download.qt.io/official_releases/qtcreator/',
        'https://download.qt.io/snapshots/qtcreator/'
    ];

    // Extract the major and minor versions
    const [major, minor] = version.split('.').slice(0, 2);
    const folderPath = `${major}.${minor}/${version}/`;

    // Helper function to check if a URL returns a non-empty response
    async function isFolderNotEmpty(url) {
        try {
            const response = await fetch(url);
            if (response.ok) {
                const text = await response.text();
                return text.trim().length > 0;
            }
        } catch (error) {
            console.error(`Error fetching ${url}:`, error);
        }
        return false;
    }

    const urlBase = baseUrls[0] + folderPath + 'installer_source/' + platform + '/';
    const notEmpty = await isFolderNotEmpty(urlBase);
    console.log(`Checking ${urlBase}: ${notEmpty ? 'Not Empty' : 'Empty'}`);
    if (notEmpty) {
        return urlBase;
    }

    const urlSnapshot = baseUrls[1] + folderPath + 'installer_source/latest/' + platform + '/';
    const notEmptySnapshot = await isFolderNotEmpty(urlSnapshot);
    console.log(`Checking ${urlSnapshot}: ${notEmptySnapshot ? 'Not Empty' : 'Empty'}`);
    if (notEmptySnapshot) {
        return urlSnapshot;
    }

    return '';
}

checkQtCreatorFolder(version).then(async(url) => {
    console.log(`Folder ${version} is ${url ? 'not empty' : 'empty'}`);

    if (!url) {
        console.log(`Folder ${version}/${platform} is empty.`);
        process.exit(1);
    }

    console.log(`Folder ${version}/${platform} is not empty. Proceeding to download.`);
    try {
        for (const packageName of ['qtcreator.7z', 'qtcreator_dev.7z']) {
            await downloadPackage(url, packageName);
        }
        process.exit(0);
    } catch (error) {
        console.error('Download failed:', error);
        process.exit(1);
    }
});