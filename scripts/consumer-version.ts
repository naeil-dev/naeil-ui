import assert from "node:assert/strict";
import { basename } from "node:path";

/** Check the standalone example before the packed-consumer runner rewrites it. */
export function assertConsumerVersion(
  pkg: { dependencies?: Record<string, string> },
  version: string,
  name: string,
) {
  const dependency = pkg.dependencies?.["@naeil/ui"];
  const currentArchive = dependency?.startsWith("file:") &&
    basename(dependency.slice(5)) === `naeil-ui-${version}.tgz`;
  assert(
    dependency === version || currentArchive,
    `${name} must target @naeil/ui ${version} or its naeil-ui-${version}.tgz archive; found ${dependency ?? "no dependency"}`,
  );
}
