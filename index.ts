import { TocModulesPlugin } from "./toc-modules-plugin";
import { ExternalModuleMapPlugin } from "./external-module-map-plugin";
import { ParameterType, PluginHost } from "typedoc/dist/lib/utils";

module.exports = function (PluginHost: PluginHost) {
  const app = PluginHost.owner;

  app.options.addDeclaration({
    name: "external-modulemap",
    type: ParameterType.String,
    help: "Regular expression to capture the module names.",
  });

  // @ts-ignore
  app.converter.addComponent("external-module-map", ExternalModuleMapPlugin);
  // @ts-ignore
  app.renderer.addComponent("toc-modules-plugin", TocModulesPlugin);
};
