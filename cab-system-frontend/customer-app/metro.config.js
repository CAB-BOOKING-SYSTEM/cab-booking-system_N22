const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const projectRoot = __dirname;
const packagesRoot = path.resolve(projectRoot, "../packages");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [...(config.watchFolders ?? []), packagesRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(path.resolve(projectRoot, "../.."), "node_modules"),
];

// Thêm alias cho react-native-maps trên web
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
});
