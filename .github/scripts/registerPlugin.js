const fs = require('fs');
const path = require('path');

// Helper function to update plugin metadata
const updatePluginMetadata = (plugin, pluginQtcData, env) => {
  plugin.meta_data.Name = pluginQtcData.Name;
  plugin.meta_data.Version = pluginQtcData.Version;
  plugin.meta_data.CompatVersion = pluginQtcData.CompatVersion;
  plugin.meta_data.Vendor = pluginQtcData.Vendor;
  plugin.meta_data.Copyright = pluginQtcData.Copyright;
  plugin.meta_data.License = [pluginQtcData.License];
  plugin.meta_data.Description = pluginQtcData.Description;
  plugin.meta_data.Url = pluginQtcData.Url;

  plugin.meta_data.Dependencies.forEach(dependency => {
    if (dependency.Name === 'Core') {
      dependency.Version = env.QT_CREATOR_VERSION_INTERNAL.split('-')[0];
    }
  });
};

const updatePluginData = (plugin, env, pluginQtcData) => {
  const dictionary_platform = {
    'Windows': `${env.HTML_URL}/${env.PLUGIN_NAME}-${env.QT_CREATOR_VERSION}-Windows-x64.7z`,
    'Linux': `${env.HTML_URL}/${env.PLUGIN_NAME}-${env.QT_CREATOR_VERSION}-Linux-x64.7z`,
    'macOS': `${env.HTML_URL}/${env.PLUGIN_NAME}-${env.QT_CREATOR_VERSION}-macOS-x64.7z`
  };

  plugin.core_compat_version = env.QT_CREATOR_VERSION_INTERNAL;
  plugin.core_version = env.QT_CREATOR_VERSION_INTERNAL;

  plugin.plugins.forEach(pluginsEntry => {
    pluginsEntry.url = dictionary_platform[plugin.host_os];
    updatePluginMetadata(pluginsEntry, pluginQtcData, env);
  });
  return plugin;
};

const createNewPluginData = (env, platform, pluginQtcData) => {
  const pluginJson = {
    "status": "published",
    "core_compat_version": "14.0.82",
    "core_version": "14.0.82",
    "host_os": platform,
    "host_os_version": "10.0.0",
    "host_os_architecture": "x86_64",
    "plugins": [
      {
        "url": "",
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
  };

  updatePluginData(pluginJson, env, pluginQtcData);
  return pluginJson;
}

const updateServerPluginJson = (endJsonData, pluginQtcData, env) => {
  // Update the global data in mainData
  endJsonData.name = pluginQtcData.Name;
  endJsonData.vendor = pluginQtcData.Vendor;
  endJsonData.version = pluginQtcData.Version;
  endJsonData.copyright = pluginQtcData.Copyright;

  endJsonData.version_history[0].version = pluginQtcData.Version;

  endJsonData.description_paragraphs = [
    {
      header: "Description",
      text: [
        pluginQtcData.Description
      ]
    }
  ];

  let found = false;
  // Update or Add the plugin data for the current Qt Creator version
  for (const plugin of endJsonData.plugin_sets) {
    if (plugin.core_compat_version === env.QT_CREATOR_VERSION_INTERNAL) {
      updatePluginData(plugin, env, pluginQtcData);
      found = true;
    }
  }

  if (!found)  {
    for (const platform of ['Windows', 'Linux', 'macOS']) {
      endJsonData.plugin_sets.push(createNewPluginData(env, platform, pluginQtcData));
    }
  }

  // Save the updated JSON file
  const serverPluginJsonPath = path.join(__dirname, `${env.PLUGIN_NAME}.json`);
  fs.writeFileSync(serverPluginJsonPath, JSON.stringify(endJsonData, null, 2), 'utf8');
};

const request = async (type, url, token, data) => {
  const response = await fetch(url, {
    method: type,
    headers: {
      'Authorization': `Bearer ${token}`,
      'accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: data ? JSON.stringify(data) : undefined
  });
  if (!response.ok) {
    const errorResponse = await response.json();
    console.error(`${type} Request Error Response:`, errorResponse); // Log the error response
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return await response.json();
}

const put = (url, token, data) => request('PUT', url, token, data)
const post = (url, token, data) => request('POST', url, token, data)
const get = (url, token) => request('GET', url, token)

const purgeCache = async (env) => {
  try {
    await post(`${env.API_URL}api/v1/cache/purgeall`, env.TOKEN, {});
    console.log('Cache purged successfully');
  } catch (error) {
    console.error('Error:', error);
  }
};

async function main() {
  const env = {
    HTML_URL: process.env.HTML_URL || process.argv[2],
    PLUGIN_NAME: process.env.PLUGIN_NAME || process.argv[3],
    QT_CREATOR_VERSION: process.env.QT_CREATOR_VERSION || process.argv[4],
    QT_CREATOR_VERSION_INTERNAL: process.env.QT_CREATOR_VERSION_INTERNAL || process.argv[5],
    TOKEN: process.env.TOKEN || process.argv[6],
    API_URL: process.env.API_URL || process.argv[7] || 'https://qtc-ext-service-admin-staging-1c7a99141c20.herokuapp.com/'
  };

  // Read the plugin JSON file
  // const pluginFilePath = path.join(__dirname, '../..', `${env.PLUGIN_NAME}.json.in`);
  // let pluginContent = fs.readFileSync(pluginFilePath, 'utf8');
  // pluginContent = pluginContent.replace(/\${IDE_PLUGIN_DEPENDENCIES};?/g, '');
  // pluginContent = pluginContent.replace(/,\s*}/g, '}');
  // const pluginQtcData = JSON.parse(pluginContent);

  const pluginQtcData = require(`../../${env.PLUGIN_NAME}-Linux-x64.json`);
  console.log('pluginQtcData:', pluginQtcData);
  const templateFileData = require('./plugin.json');
  
  if (env.API_URL === '') {
    updateServerPluginJson(templateFileData, pluginQtcData, env);
    process.exit(0);
  }

  const response = await get(`${env.API_URL}api/v1/admin/extensions?search=${env.PLUGIN_NAME}`, env.TOKEN);
  if (response.items.length > 0 && response.items[0].extension_id !== '') {
    const pluginId = response.items[0].extension_id;
    console.log('Plugin found. Updating the plugin');
    updateServerPluginJson(response.items[0], pluginQtcData, env);

    await put(`${env.API_URL}api/v1/admin/extensions/${pluginId}`, env.TOKEN, response.items[0]);
  } else {
    console.log('No plugin found. Creating a new plugin');
    updateServerPluginJson(templateFileData, pluginQtcData, env);
    await post(`${env.API_URL}api/v1/admin/extensions`, env.TOKEN, templateFileData);
  }
  await purgeCache(env);
}

main().then(() => console.log('JSON file updated successfully'));