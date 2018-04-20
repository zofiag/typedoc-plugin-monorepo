var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports", "path", "fs", "marked", "typedoc/dist/lib/converter/components", "typedoc/dist/lib/converter/converter", "typedoc/dist/lib/converter/plugins/CommentPlugin", "typedoc/dist/lib/models/comments", "typedoc/dist/lib/utils/options"], factory);
    }
})(function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path = require("path");
    var fs = require("fs");
    var marked = require("marked");
    var components_1 = require("typedoc/dist/lib/converter/components");
    var converter_1 = require("typedoc/dist/lib/converter/converter");
    var CommentPlugin_1 = require("typedoc/dist/lib/converter/plugins/CommentPlugin");
    var comments_1 = require("typedoc/dist/lib/models/comments");
    var options_1 = require("typedoc/dist/lib/utils/options");
    // tslint:disable-next-line ban-types
    // ReflectionKind["Package"] = 1337;
    // declare module "typedoc/dist/lib/models/reflections/abstract" {
    //   export enum ReflectionKind {
    //     "Package" = 1337
    //   }
    // }
    marked.setOptions({
        renderer: new marked.Renderer(),
        highlight: function (code) {
            return require('highlight.js').highlightAuto(code).value;
        },
        pedantic: false,
        gfm: true,
        tables: true,
        breaks: false,
        sanitize: false,
        smartLists: true,
        smartypants: false,
    });
    /**
     * This plugin allows you to provide a mapping regexp between your source folder structure, and the module that should be
     * reported in typedoc. It will match the first capture group of your regex and use that as the module name.
     *
     * Based on https://github.com/christopherthielen/typedoc-plugin-external-module-name
     *
     *
     */
    var ExternalModuleMapPlugin = /** @class */ (function (_super) {
        __extends(ExternalModuleMapPlugin, _super);
        function ExternalModuleMapPlugin() {
            return _super !== null && _super.apply(this, arguments) || this;
        }
        ExternalModuleMapPlugin.prototype.initialize = function () {
            this.modules = new Set();
            this.options = this.application.options;
            this.listenTo(this.owner, (_a = {},
                _a[converter_1.Converter.EVENT_BEGIN] = this.onBegin,
                _a[converter_1.Converter.EVENT_CREATE_DECLARATION] = this.onDeclarationBegin,
                _a[converter_1.Converter.EVENT_RESOLVE_BEGIN] = this.onBeginResolve,
                _a));
            var _a;
        };
        /**
         * Triggered when the converter begins converting a project.
         *
         * @param context  The context object describing the current state the converter is in.
         */
        ExternalModuleMapPlugin.prototype.onBegin = function (context) {
            this.moduleRenames = [];
            this.options.read({}, options_1.OptionsReadMode.Prefetch);
            this.externalmap = (this.options.getValue('external-modulemap'));
            if (!!this.externalmap) {
                try {
                    console.log("INFO: applying regexp ", this.externalmap, " to calculate module names");
                    this.mapRegEx = new RegExp(this.externalmap);
                    this.isMappingEnabled = true;
                    console.log("INFO: Enabled", this.isMappingEnabled);
                }
                catch (e) {
                    console.log("WARN: external map not recognized. Not processing.", e);
                }
            }
        };
        ExternalModuleMapPlugin.prototype.onDeclarationBegin = function (context, reflection, node) {
            if (!node || !this.isMappingEnabled)
                return;
            var fileName = node.fileName;
            var match = this.mapRegEx.exec(fileName);
            /*
        
            */
            if (null != match) {
                console.log(' Mapping ', fileName, ' ==> ', match[1]);
                this.modules.add(match[1]);
                this.moduleRenames.push({
                    renameTo: match[1],
                    reflection: reflection
                });
            }
        };
        /**
         * Triggered when the converter begins resolving a project.
         *
         * @param context  The context object describing the current state the converter is in.
         */
        ExternalModuleMapPlugin.prototype.onBeginResolve = function (context) {
            var projRefs = context.project.reflections;
            var refsArray = Object.keys(projRefs).reduce(function (m, k) { m.push(projRefs[k]); return m; }, []);
            // Process each rename
            this.moduleRenames.forEach(function (item) {
                var renaming = item.reflection;
                // Find an existing module that already has the "rename to" name.  Use it as the merge target.
                var mergeTarget = refsArray.filter(function (ref) { return ref.kind === renaming.kind && ref.name === item.renameTo; })[0];
                // If there wasn't a merge target, just change the name of the current module and exit.
                if (!mergeTarget) {
                    renaming.name = item.renameTo;
                    return;
                }
                if (!mergeTarget.children) {
                    mergeTarget.children = [];
                }
                // Since there is a merge target, relocate all the renaming module's children to the mergeTarget.
                var childrenOfRenamed = refsArray.filter(function (ref) { return ref.parent === renaming; });
                childrenOfRenamed.forEach(function (ref) {
                    // update links in both directions
                    //console.log(' merging ', mergeTarget, ref);
                    ref.parent = mergeTarget;
                    mergeTarget.children.push(ref);
                });
                // Now that all the children have been relocated to the mergeTarget, delete the empty module
                // Make sure the module being renamed doesn't have children, or they will be deleted
                if (renaming.children)
                    renaming.children.length = 0;
                CommentPlugin_1.CommentPlugin.removeReflection(context.project, renaming);
            });
            this.modules.forEach(function (name) {
                var ref = refsArray.filter(function (ref) { return ref.name === name; })[0];
                var root = ref.originalName.replace(new RegExp(name + ".*", 'gi'), name);
                try {
                    // tslint:disable-next-line ban-types
                    Object.defineProperty(ref, "kindString", {
                        get: function () { return "Package"; },
                        set: function (newValue) { return "Package"; },
                    });
                    var readme = fs.readFileSync(path.join(root, 'README.md'));
                    ref.comment = new comments_1.Comment("", marked(readme.toString()));
                }
                catch (e) {
                    console.error("No README found for module \"" + name + "\"");
                }
            });
        };
        ExternalModuleMapPlugin = __decorate([
            components_1.Component({ name: 'external-module-map' })
        ], ExternalModuleMapPlugin);
        return ExternalModuleMapPlugin;
    }(components_1.ConverterComponent));
    exports.ExternalModuleMapPlugin = ExternalModuleMapPlugin;
});
