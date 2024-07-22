const fs = require('fs');
const path = require('path');

// Read inputs from environment variables or arguments
const HTML_URL = process.env.HTML_URL || process.argv[2];
const PLUGIN_NAME = process.env.PLUGIN_NAME || process.argv[3];
const QT_CREATOR_VERSION = process.env.QT_CREATOR_VERSION || process.argv[4];

// Read the main JSON files
const mainFilePath = path.join(__dirname, 'data.json');
const mainData = JSON.parse(fs.readFileSync(mainFilePath, 'utf8'));

// Read the plugin JSON file
const pluginFilePath = path.join(__dirname, `${PLUGIN_NAME}.json.in`);
let pluginContent = fs.readFileSync(pluginFilePath, 'utf8');
// pluginContent = pluginContent.replace('${IDE_PLUGIN_DEPENDENCIES}', '');
pluginContent = pluginContent.replace(/\${IDE_PLUGIN_DEPENDENCIES};?/g, '');
pluginContent = pluginContent.replace(/,\s*}/g, '}');
const pluginData = JSON.parse(pluginContent);

// Define the new URLs
const windowsUrl = `${HTML_URL}/${PLUGIN_NAME}-${QT_CREATOR_VERSION}-Windows-x64.7z`;
const linuxUrl = `${HTML_URL}/${PLUGIN_NAME}-${QT_CREATOR_VERSION}-Linux-x64.7z`;
const macosUrl = `${HTML_URL}/${PLUGIN_NAME}-${QT_CREATOR_VERSION}-macOS-x64.7z`;

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
};

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


// Update the plugin_sets URLs, versions, and metadata
mainData.plugin_sets.forEach(set => {
  set.core_compat_version_major = parseInt(QT_CREATOR_VERSION.split('.')[0]);
  set.core_compat_version_minor = parseInt(QT_CREATOR_VERSION.split('.')[1]);
  set.core_compat_version_patch = parseInt(QT_CREATOR_VERSION.split('.')[2]);
  set.core_compat_version_qualifier = 0;

  set.core_version_major = parseInt(QT_CREATOR_VERSION.split('.')[0]);
  set.core_version_minor = parseInt(QT_CREATOR_VERSION.split('.')[1]);
  set.core_version_patch = parseInt(QT_CREATOR_VERSION.split('.')[2]) + 1;

  if (set.host_os === 'Windows') {
    set.plugins.forEach(plugin => {
      plugin.url = windowsUrl;
      updatePluginMetadata(plugin, pluginData);
    });
  } else if (set.host_os === 'Linux') {
    set.plugins.forEach(plugin => {
      plugin.url = linuxUrl;
      updatePluginMetadata(plugin, pluginData);
    });
  } else if (set.host_os === 'macOS') {
    set.plugins.forEach(plugin => {
      plugin.url = macosUrl;
      updatePluginMetadata(plugin, pluginData);
    });
  }
});

// Save the updated JSON file
fs.writeFileSync(mainFilePath, JSON.stringify(mainData, null, 2), 'utf8');

console.log('JSON file updated successfully');