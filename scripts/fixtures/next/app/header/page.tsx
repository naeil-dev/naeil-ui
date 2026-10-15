"use client";
import Link from "next/link";
import { NaeilHeader } from "@naeil/ui/naeil-header";
import { Button } from "@naeil/ui/ui";
export default function HeaderPage() {
  return <><NaeilHeader locale="ja" Link={Link} authSlot={<Button>Next account</Button>} /><main><h1>Packed shared header</h1></main></>;
}
