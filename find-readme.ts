import findUp from "find-up";
import fs from "fs";
import path from "path";
import { Reflection } from "typedoc";

export function findReadme(reflection: Reflection): string | undefined {
  const filename = reflection.sources?.[0]?.fileName;

  if (!filename) {
    return undefined;
  }

  const readmeFilename = findUp.sync("README.md", {
    cwd: path.dirname(filename),
  });

  if (!readmeFilename) {
    return undefined;
  }

  try {
    return fs.readFileSync(readmeFilename).toString();
  } catch {
    return undefined;
  }
}
