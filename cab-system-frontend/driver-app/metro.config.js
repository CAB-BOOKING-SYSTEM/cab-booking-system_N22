const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Thêm alias cho các package nội bộ (@cab/*)
config.resolver.extraNodeModules = {
  '@cab/shared-types': path.resolve(workspaceRoot, 'cab-system-frontend/packages/shared-types'),
  '@cab/shared-utils': path.resolve(workspaceRoot, 'cab-system-frontend/packages/shared-utils'),
  '@cab/api-client': path.resolve(workspaceRoot, 'cab-system-frontend/packages/api-client'),
  '@cab/mobile-ui': path.resolve(workspaceRoot, 'cab-system-frontend/packages/mobile-ui'),
  '@cab/map-core': path.resolve(workspaceRoot, 'cab-system-frontend/packages/map-core'),
  '@cab/realtime': path.resolve(workspaceRoot, 'cab-system-frontend/packages/realtime'),
};

module.exports = config;
