"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/routing";
import Image from "next/image";
import { Avatar, AvatarImage, AvatarFallback } from "./ui/avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { logout } from "@/app/[locale]/login/actions";
import { ANIMALS, hashUserId } from "@/lib/auth/avatar";

interface AuthUser {
  id: string;
  name?: string;
  email?: string;
}

export function AuthSlot({ user }: { user: AuthUser | null }) {
  const t = useTranslations("auth");
  const locale = useLocale();
  const pathname = usePathname();

  if (!user) {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(pathname)}`}
        className="text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
      >
        {t("login")}
      </Link>
    );
  }

  const animalSrc = ANIMALS[hashUserId(user.id)];
  const displayName = user.name || user.email?.split("@")[0] || "User";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="cursor-pointer focus:outline-none">
          <Avatar>
            <AvatarImage src={animalSrc} alt={displayName} />
            <AvatarFallback>
              {displayName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-3 font-normal">
          <Image
            src={animalSrc}
            alt=""
            width={32}
            height={32}
            className="shrink-0 rounded-full"
          />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-sm font-medium">{displayName}</span>
            {user.email && (
              <span className="text-muted-foreground truncate text-xs">
                {user.email}
              </span>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => logout(locale)}>
          {t("logout")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
