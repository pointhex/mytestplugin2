const https = require('https');
const fs = require('fs');
const { URL } = require('url');

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

async function downloadQtCreator(baseUrl, packageName) {
    const url = baseUrl + packageName + '.7z';
    const outputPath = packageName + '.7z';
    return new Promise((resolve, reject) => {
        function getFinalUrl(url) {
            return new Promise((resolve, reject) => {
                https.get(url, (response) => {
                    if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
                        // Handle redirection
                        const redirectedUrl = new URL(response.headers.location, url).href;
                        getFinalUrl(redirectedUrl).then(resolve).catch(reject);
                    } else if (response.statusCode === 200) {
                        resolve(url);
                    } else {
                        reject(new Error(`Failed to get '${url}' (${response.statusCode})`));
                    }
                }).on('error', (err) => {
                    reject(err);
                });
            });
        }

        getFinalUrl(url).then(finalUrl => {
            https.get(finalUrl, (response) => {
                if (response.statusCode !== 200) {
                    return reject(new Error(`Failed to get '${finalUrl}' (${response.statusCode})`));
                }

                const file = fs.createWriteStream(outputPath);

                response.pipe(file);

                file.on('finish', () => {
                    file.close(() => {
                        console.log('Download complete');
                        resolve();
                    });
                });

                file.on('error', (err) => {
                    fs.unlink(outputPath, () => {}); // Delete the file if there's an error
                    reject(err);
                });
            }).on('error', (err) => {
                reject(err);
            });
        }).catch(reject);
    });
}


checkQtCreatorFolder(version).then(async(url) => {
    console.log(`Folder ${version} is ${url ? 'not empty' : 'empty'}`);

    if (!url) {
        console.log(`Folder ${version}/${platform} is empty.`);
        process.exit(1);
    }

    console.log(`Folder ${version}/${platform} is not empty. Proceeding to download.`);
    try {
        for (const packageName of ['qtcreator', 'qtcreator_dev']) {
            await downloadQtCreator(url, packageName);
        }
        console.log('Download complete.');
        process.exit(0);
    } catch (error) {
        console.error('Download failed:', error);
        process.exit(1);
    }
});