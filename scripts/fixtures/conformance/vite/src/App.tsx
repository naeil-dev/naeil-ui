import { NaeilServiceShell, PageHeader } from '@naeil/ui/naeil-shell';
export default function App() {
  return <NaeilServiceShell account={{status: "signed-out", loginHref: "/login"}} service="estimate" locale="en"><PageHeader title="Estimates" /></NaeilServiceShell>;
}
