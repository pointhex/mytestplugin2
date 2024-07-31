const https = require('https');
const fs = require('fs');
async function downloadPackage(baseUrl, packageName) {
    const url = baseUrl + packageName;
    const outputPath = packageName;
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
                        reject(`Failed to get '${url}' (${response.statusCode})`);
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
                        console.log('Download complete for', outputPath);
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

module.exports = {
    downloadPackage
};
