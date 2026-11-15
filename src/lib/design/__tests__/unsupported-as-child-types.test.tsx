import { expect, it } from "vitest";
import { SelectTrigger, SelectContent, SelectItem } from "../../../components/ui/select";
import { DialogContent } from "../../../components/ui/dialog";
import { SheetContent } from "../../../components/ui/sheet";
import { DropdownMenuCheckboxItem, DropdownMenuRadioItem, DropdownMenuSubTrigger } from "../../../components/ui/dropdown-menu";
import { Checkbox } from "../../../components/ui/checkbox";
import { Switch } from "../../../components/ui/switch";

it("rejects unsupported decorated asChild compositions", () => {
  const elements = [
    // @ts-expect-error SelectTrigger owns multiple children or the control itself
    <SelectTrigger key="SelectTrigger" asChild><button>Control</button></SelectTrigger>,
    // @ts-expect-error SelectContent owns multiple children or the control itself
    <SelectContent key="SelectContent" asChild><button>Control</button></SelectContent>,
    // @ts-expect-error SelectItem owns multiple children or the control itself
    <SelectItem key="SelectItem" asChild value="one"><button>Control</button></SelectItem>,
    // @ts-expect-error DialogContent owns multiple children or the control itself
    <DialogContent key="DialogContent" asChild><button>Control</button></DialogContent>,
    // @ts-expect-error SheetContent owns multiple children or the control itself
    <SheetContent key="SheetContent" asChild><button>Control</button></SheetContent>,
    // @ts-expect-error DropdownMenuCheckboxItem owns multiple children or the control itself
    <DropdownMenuCheckboxItem key="DropdownMenuCheckboxItem" asChild><button>Control</button></DropdownMenuCheckboxItem>,
    // @ts-expect-error DropdownMenuRadioItem owns multiple children or the control itself
    <DropdownMenuRadioItem key="DropdownMenuRadioItem" asChild value="one"><button>Control</button></DropdownMenuRadioItem>,
    // @ts-expect-error DropdownMenuSubTrigger owns multiple children or the control itself
    <DropdownMenuSubTrigger key="DropdownMenuSubTrigger" asChild><button>Control</button></DropdownMenuSubTrigger>,
    // @ts-expect-error Checkbox owns multiple children or the control itself
    <Checkbox key="Checkbox" asChild><button>Control</button></Checkbox>,
    // @ts-expect-error Switch owns multiple children or the control itself
    <Switch key="Switch" asChild><button>Control</button></Switch>,
  ];
  expect(elements).toHaveLength(10);
});
