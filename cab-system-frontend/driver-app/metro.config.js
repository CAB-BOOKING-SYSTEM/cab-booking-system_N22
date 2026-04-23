const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const packagesRoot = path.resolve(projectRoot, "../packages");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), packagesRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(path.resolve(projectRoot, "../.."), "node_modules"),
];

module.exports = config;
