const fs = require('fs');
const path = require('path');

// Get the URLs from command-line arguments or environment variables
const windowsUrl = process.argv[2] || process.env.WINDOWS_URL;
const linuxUrl = process.argv[3] || process.env.LINUX_URL;

if (!windowsUrl || !linuxUrl) {
    console.error('Please provide the URLs for Windows and Linux.');
    process.exit(1);
}

const filePath = path.join(__dirname, 'data.json');

// Read JSON file
fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
        console.error('Error reading the file:', err);
        return;
    }

    // Parse JSON data
    let jsonData;
    try {
        jsonData = JSON.parse(data);
    } catch (parseError) {
        console.error('Error parsing JSON data:', parseError);
        return;
    }

    // Modify the URLs based on host_os
    jsonData.plugin_sets.forEach(set => {
        if (set.host_os === 'Windows') {
            set.plugins.forEach(plugin => {
                plugin.url = windowsUrl;
            });
        } else if (set.host_os === 'Linux') {
            set.plugins.forEach(plugin => {
                plugin.url = linuxUrl;
            });
        }
    });

    // Convert JSON object back to string
    const updatedData = JSON.stringify(jsonData, null, 2);

    // Write updated JSON back to file
    fs.writeFile(filePath, updatedData, 'utf8', (err) => {
        if (err) {
            console.error('Error writing to the file:', err);
            return;
        }
        console.log('JSON file has been updated.');
    });
});

