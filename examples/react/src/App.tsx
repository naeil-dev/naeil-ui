import { useState } from "react";
import { Button, Input, Switch } from "@naeil/ui/ui";
import { PageTitle } from "@naeil/ui/components/typography";
import { ThemeProvider } from "@naeil/ui/components/theme-provider";

export function App() {
  const [saved, setSaved] = useState(false);
  return (
    <ThemeProvider attribute="class">
      <main className="mx-auto p-6" data-ui-layout="settings">
        <PageTitle>Profile preferences</PageTitle>
        <form
          className="mt-6 grid gap-6"
          onSubmit={(event) => {
            event.preventDefault();
            setSaved(true);
          }}
          onChange={() => setSaved(false)}
        >
          <div className="grid gap-2">
            <label htmlFor="display-name">Display name</label>
            <Input
              id="display-name"
              name="displayName"
              defaultValue="Alex"
              required
            />
          </div>
          <div className="ui-choice-label">
            <Switch id="notifications" name="notifications" defaultChecked />
            <label htmlFor="notifications">Email notifications</label>
          </div>
          <Button type="submit" className="justify-self-start">
            Save preferences
          </Button>
          <p role="status">
            {saved ? "Preferences saved for this example." : ""}
          </p>
        </form>
      </main>
    </ThemeProvider>
  );
}
