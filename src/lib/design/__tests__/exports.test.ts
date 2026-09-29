import { expect, it } from "vitest";
import * as ui from "../../../components/ui";

it("provides the form controls required by the approved shared compositions", () => {
  for (const name of [
    "Select",
    "SelectTrigger",
    "SelectValue",
    "SelectContent",
    "SelectItem",
    "Switch",
    "Checkbox",
  ]) {
    expect(ui, `missing public ${name}`).toHaveProperty(name);
  }
});
