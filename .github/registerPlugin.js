const fs = require('fs');
const path = require('path');

const pluginJson = `{
  "set_id": null,
  "status": "published",
  "core_compat_version": 14.0.82,
  "core_version": 14.0.82,
  "host_os": "Windows",
  "host_os_version": 10.0.0,
  "host_os_architecture": "x86_64",
  "plugins": [
    {
      "url": "https://github.com/pointhex/mytestplugin2/releases/download/v.1.0.30/Myplugintest-15.0.0-Windows-x64.7z",
      "size": 5000,
      "meta_data": {
        "Category": "Core",
        "Version": "0.0.1",
        "CompatVersion": "0.0.1",
        "Copyright": "(C) MyCompany",
        "Name": "Myplugintest",
        "Url": "https://www.mycompany.com",
        "Vendor": "MyCompany",
        "Description": "Put a short description of your plugin here",
        "License": [
          "Put short license information here"
        ],
        "Dependencies": [
          {
            "Name": "Core",
            "Version": "14.0.82"
          }
        ]
      },
      "dependencies": []
    }
  ]
}`;


// Read inputs from environment variables or arguments
const HTML_URL = process.env.HTML_URL || process.argv[2];
const PLUGIN_NAME = process.env.PLUGIN_NAME || process.argv[3];
const QT_CREATOR_VERSION = process.env.QT_CREATOR_VERSION || process.argv[4];
const QT_CREATOR_VERSION_INTERNAL = process.env.QT_CREATOR_VERSION_INTERNAL || process.argv[5];
const TOKEN = process.env.TOKEN || process.argv[6];

// Read the main JSON files
const mainFilePath = path.join(__dirname, 'template.json');
const mainData = JSON.parse(fs.readFileSync(mainFilePath, 'utf8'));

// Read the plugin JSON file
const pluginFilePath = path.join(__dirname, '..', `${PLUGIN_NAME}.json.in`);
let pluginContent = fs.readFileSync(pluginFilePath, 'utf8');
pluginContent = pluginContent.replace(/\${IDE_PLUGIN_DEPENDENCIES};?/g, '');
pluginContent = pluginContent.replace(/,\s*}/g, '}');
const pluginData = JSON.parse(pluginContent);

// Helper function to update plugin metadata
const updatePluginMetadata = (plugin, pluginData) => {
  plugin.meta_data.Name = pluginData.Name;
  plugin.meta_data.Version = pluginData.Version;
  plugin.meta_data.CompatVersion = pluginData.CompatVersion;
  plugin.meta_data.Vendor = pluginData.Vendor;
  plugin.meta_data.Copyright = pluginData.Copyright;
  plugin.meta_data.License = [pluginData.License];
  plugin.meta_data.Description = pluginData.Description;
  plugin.meta_data.Url = pluginData.Url;

  plugin.meta_data.Dependencies.forEach(dependency => {
    if (dependency.Name === 'Core') {
      dependency.Version = QT_CREATOR_VERSION_INTERNAL.split('-')[0];
    }
  });
};

const updatePluginData = (plugin, QtCVersion) => {
  const dictionary_platform = {
    'Windows': `${HTML_URL}/${PLUGIN_NAME}-${QT_CREATOR_VERSION}-Windows-x64.7z`,
    'Linux': `${HTML_URL}/${PLUGIN_NAME}-${QT_CREATOR_VERSION}-Linux-x64.7z`,
    'macOS': `${HTML_URL}/${PLUGIN_NAME}-${QT_CREATOR_VERSION}-macOS-x64.7z`
  };

  plugin.core_compat_version = QtCVersion
  plugin.core_version = QtCVersion;

  plugin.plugins.forEach(plugin => {
    plugin.url = dictionary_platform[plugin.host_os];
    updatePluginMetadata(plugin, pluginData);
  });
};

const updateMainData = (mainData, pluginData) => {
  // Update the global data in mainData
  mainData.name = pluginData.Name;
  mainData.vendor = pluginData.Vendor;
  mainData.version = pluginData.Version;
  mainData.copyright = pluginData.Copyright;
  mainData.description_paragraphs = [
    {
      header: "Description",
      text: [
        pluginData.Description
      ]
    }
  ];

  // Update or Add the plugin data for the current Qt Creator version
  for (const plugin of mainData.plugin_sets) {
    if (plugin.core_compat_version === QT_CREATOR_VERSION) {
      updatePluginData(plugin, QT_CREATOR_VERSION);
      continue;
    }

    for (const platform of ['Windows', 'Linux', 'macOS']) {
      const newPlugin = JSON.parse(pluginJson);
      newPlugin.host_os = platform;
      updatePluginData(newPlugin, QT_CREATOR_VERSION);
      mainData.plugin_sets.push(newPlugin);
    }
  }

  // Save the updated JSON file
  fs.writeFileSync(mainFilePath, JSON.stringify(mainData, null, 2), 'utf8');
};

const makeGetRequest = async (url, token) => {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

// Function to make a PUT request
const makePutRequest = async (url, data, token) => {
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    const errorResponse = await response.json();
    console.error('PUT Request Error Response:', errorResponse); // Log the error response    
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

const makePostRequest = async (url, data, token) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
};

const url = `https://qtc-ext-service-admin-staging-1c7a99141c20.herokuapp.com/api/v1/admin/extensions?search=${PLUGIN_NAME}`;
makeGetRequest(url, TOKEN)
.then(response => {
    if (response.items.length > 0 && response.items[0].extension_id !== '') {
      const pluginId = response.items[0].extension_id;
      updateMainData(response.items[0], pluginData);
      makePutRequest(
        `https://qtc-ext-service-admin-staging-1c7a99141c20.herokuapp.com/api/v1/admin/extensions/${pluginId}`, mainData, TOKEN)
      .catch(error => console.error('Error:', error));
    } else {
      updateMainData(mainData, pluginData);
      makePostRequest(
        'https://qtc-ext-service-admin-staging-1c7a99141c20.herokuapp.com/api/v1/admin/extensions', mainData, TOKEN)
      .catch(error => console.error('Error:', error));
    }
  })
  .catch(error => console.error('Error:', error));

console.log('JSON file updated successfully');