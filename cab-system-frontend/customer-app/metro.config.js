const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Theo dõi toàn bộ thư mục root trong monorepo
config.watchFolders = [workspaceRoot];

// 2. Ép Metro tìm node_modules ở cả thư mục hiện tại và root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Thêm alias cho các package nội bộ (@cab/*)
config.resolver.extraNodeModules = {
  '@cab/shared-types': path.resolve(workspaceRoot, 'cab-system-frontend/packages/shared-types'),
  '@cab/shared-utils': path.resolve(workspaceRoot, 'cab-system-frontend/packages/shared-utils'),
  '@cab/api-client': path.resolve(workspaceRoot, 'cab-system-frontend/packages/api-client'),
  '@cab/mobile-ui': path.resolve(workspaceRoot, 'cab-system-frontend/packages/mobile-ui'),
  '@cab/map-core': path.resolve(workspaceRoot, 'cab-system-frontend/packages/map-core'),
  '@cab/realtime': path.resolve(workspaceRoot, 'cab-system-frontend/packages/realtime'),
  // Alias cho web
  'react-native-maps': path.resolve(projectRoot, 'node_modules/@teovilla/react-native-web-maps'),
};

// 4. Custom resolver để ưu tiên bản web của một số thư viện
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === "web" && moduleName === "react-native-maps") {
    return {
      filePath: require.resolve("@teovilla/react-native-web-maps"),
      type: "sourceFile",
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, {
  input: "./src/index.css",
  projectRoot,
  configPath: path.resolve(projectRoot, "tailwind.config.js"),
});
