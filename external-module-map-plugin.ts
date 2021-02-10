import * as ts from "typescript";

import {
  Component,
  ConverterComponent,
} from "typedoc/dist/lib/converter/components";
import { Converter } from "typedoc/dist/lib/converter/converter";
import { Context } from "typedoc/dist/lib/converter/context";
import { Comment } from "typedoc/dist/lib/models/comments";
import { Options } from "typedoc/dist/lib/utils/options";
import { DeclarationReflection, ReflectionKind } from "typedoc";
import { findReadme } from "./find-readme";

interface ModuleRename {
  readonly renameTo: string;
  readonly reflection: DeclarationReflection;
}

/**
 * This plugin allows you to provide a mapping regexp between your source folder
 * structure, and the module that should be reported in typedoc. It will match
 * the first capture group of your regex and use that as the module name.
 *
 * Based on
 * https://github.com/christopherthielen/typedoc-plugin-external-module-name
 *
 *
 */
@Component({ name: "external-module-map" })
export class ExternalModuleMapPlugin extends ConverterComponent {
  /** List of module reflections which are models to rename */
  private moduleRenames: ModuleRename[] = [];
  private mapRegEx?: RegExp;
  private options!: Options;
  private modules: Set<string> = new Set();

  initialize() {
    this.options = this.application.options;
    this.listenTo(this.owner, {
      [Converter.EVENT_BEGIN]: this.onBegin,
      [Converter.EVENT_CREATE_DECLARATION]: this.onDeclarationBegin,
      [Converter.EVENT_RESOLVE_BEGIN]: this.onBeginResolve,
    });
  }

  /**
   * Triggered when the converter begins converting a project.
   */
  private onBegin() {
    const externalmap = this.options.getValue("external-modulemap");

    if (typeof externalmap === "string") {
      try {
        console.log(
          "INFO: applying regexp ",
          externalmap,
          " to calculate module names"
        );
        this.mapRegEx = new RegExp(externalmap);
      } catch (e) {
        console.log("WARN: external map not recognized. Not processing.", e);
      }
    }
  }

  private onDeclarationBegin(
    _context: Context,
    reflection: DeclarationReflection,
    node?: ts.Node
  ) {
    if (!this.mapRegEx || !node || !ts.isSourceFile(node)) {
      return;
    }

    const match = this.mapRegEx.exec(node.fileName);

    if (match) {
      const renameTo = match[1];

      console.log(`Mapping "${reflection.originalName}" to "${renameTo}"`);

      this.modules.add(renameTo);
      this.moduleRenames.push({ renameTo, reflection });
    }
  }

  /**
   * Triggered when the converter begins resolving a project.
   *
   * @param context  The context object describing the current state the
   * converter is in.
   */
  private onBeginResolve(context: Context) {
    for (const item of this.moduleRenames) {
      // Find an existing module that already has the "rename to" name. Use it
      // as the merge target.
      const mergeTarget = context.project
        .getReflectionsByKind(item.reflection.kind)
        .find(
          (ref): ref is DeclarationReflection => ref.name === item.renameTo
        );

      // If there wasn't a merge target, just change the name of the current
      // module and continue.
      if (!mergeTarget) {
        item.reflection.name = item.renameTo;

        continue;
      }

      // Since there is a merge target, relocate all the renaming module's
      // children to the mergeTarget.
      if (item.reflection.children) {
        if (!mergeTarget.children) {
          mergeTarget.children = [];
        }

        for (const child of item.reflection.children) {
          child.parent = mergeTarget;

          if (!mergeTarget.getChildByName(child.name)) {
            mergeTarget.children.push(child);
          }
        }

        item.reflection.children.length = 0;
      }

      // Finally remove the now empty module.
      context.project.removeReflection(item.reflection);
    }

    for (const moduleName of this.modules) {
      const moduleReflection = context.project
        .getReflectionsByKind(ReflectionKind.Module)
        .find((ref) => ref.name === moduleName);

      if (!moduleReflection) {
        continue;
      }

      moduleReflection.kindString = "Package";

      const readme = findReadme(moduleReflection);

      if (readme) {
        moduleReflection.comment = new Comment("", readme.toString());
      } else {
        console.error(`No README found for module "${moduleName}"`);
      }
    }
  }
}
