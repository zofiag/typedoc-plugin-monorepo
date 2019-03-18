const {TocModulesPlugin} = require("./dist/toc-modules-plugin");
const {ExternalModuleMapPlugin} = require("./dist/external-module-map-plugin");

module.exports = function(PluginHost) {
  const app = PluginHost.owner;

  app.options.addDeclaration({ name: 'external-modulemap', short: 'em' });
  app.converter.addComponent('external-module-map', ExternalModuleMapPlugin);

  app.renderer.addComponent('toc-modules-plugin', TocModulesPlugin);
};

