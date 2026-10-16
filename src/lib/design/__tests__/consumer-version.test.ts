import { describe, expect, it } from "vitest";
import { assertConsumerVersion } from "../../../../scripts/consumer-version";

describe("standalone consumer version before packed-fixture replacement", () => {
  const check = (dependency: string | undefined) => {
    assertConsumerVersion({ dependencies: dependency ? { "@naeil/ui": dependency } : {} }, "0.5.0", "React example");
  };
  it.each(["file:../../naeil-ui-0.5.0.tgz", "0.5.0"])("accepts the current artifact: %s", dependency => {
    expect(() => check(dependency)).not.toThrow();
  });
  it.each([undefined, "file:../../naeil-ui-0.4.0.tgz", "0.4.0", "^0.5.0", "file:../../other-0.5.0.tgz"])("rejects a stale or ambiguous standalone dependency: %s", dependency => {
    expect(() => check(dependency)).toThrow(/React example.*0\.5\.0/);
  });
});
