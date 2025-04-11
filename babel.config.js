module.exports = {
  presets: ["babel-preset-gatsby"],
  plugins: [
    [
      "babel-plugin-lodash",
      {
        // This will cause the plugin to use isImportOrExportDeclaration instead of isModuleDeclaration
        "id": ["lodash", "recompose"]
      }
    ]
  ]
};