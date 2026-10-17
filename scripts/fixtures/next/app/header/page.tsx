"use client";
import Link from "next/link";
import { NaeilHeader, NaeilHeaderAccountControl } from "@naeil/ui/naeil-header";
export default function HeaderPage() {
  return <><NaeilHeader locale="ja" Link={Link} authSlot={<NaeilHeaderAccountControl locale="ja" account={{ status: "signed-in", onLogout: () => {} }} />} /><main><h1>Packed shared header</h1></main></>;
}
