const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const packagesRoot = path.resolve(projectRoot, "../packages");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot, packagesRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  "@cab-booking/api-client": path.resolve(packagesRoot, "api-client"),
  "@cab-booking/realtime": path.resolve(packagesRoot, "realtime"),
  "@cab-booking/shared-types": path.resolve(packagesRoot, "shared-types"),
};

module.exports = config;
