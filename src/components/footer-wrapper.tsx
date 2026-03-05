"use client";

import { Footer } from "./footer";
import { Link } from "@/i18n/routing";

export function FooterWrapper() {
  return <Footer Link={Link} linksExternal={false} />;
}
