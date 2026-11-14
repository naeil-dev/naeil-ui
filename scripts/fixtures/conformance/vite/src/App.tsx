import { NaeilServiceShell, PageHeader } from '@naeil/ui/naeil-shell';
export default function App() {
  return <NaeilServiceShell service="estimate" locale="en"><PageHeader title="Estimates" /></NaeilServiceShell>;
}
