import { cn } from "@naeil/ui/utils";
import { cn as deepCn } from "@naeil/ui/lib/utils";
import { buttonVariants } from "@naeil/ui/components/ui/button";
import { badgeVariants } from "@naeil/ui/components/ui/badge";

// No client boundary: these helpers must execute during server prerendering.
export default function ServerUtilities() {
  return (
    <main data-rsc-cn={cn("p-6", "p-2")} data-rsc-deep-cn={deepCn("m-6", "m-2")}>
      <a href="https://example.com/" className={buttonVariants({ variant: "outline" })}>Server button variants</a>
      <span className={badgeVariants({ variant: "success" })}>Server badge variants</span>
    </main>
  );
}
