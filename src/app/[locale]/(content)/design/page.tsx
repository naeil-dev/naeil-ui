"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Card,
  CardElevated,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarBadge,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import {
  PageTitle,
  SectionTitle,
  pageTitleClass,
  sectionTitleClass,
} from "@/components/typography";
import { toast } from "sonner";
import colorTokens from "@/tokens/color.json";
import radiusTokens from "@/tokens/radius.json";
import spacingTokens from "@/tokens/spacing.json";
import typeTokens from "@/tokens/typography.json";

// The token source owns numeric values; the website only supplies presentation.
function valuesFrom(tokens: Record<string, unknown>) {
  return Object.entries(tokens).flatMap(([name, value]) =>
    typeof value === "object" &&
    value !== null &&
    "$value" in value &&
    typeof value.$value === "string"
      ? [{ name, value: value.$value }]
      : [],
  );
}
const SEMANTIC_TOKENS = [
  "background",
  "foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "primary",
  "primary-foreground",
  "primary-hover",
  "surface-selected",
  "secondary",
  "secondary-foreground",
  "muted",
  "muted-foreground",
  "accent",
  "accent-foreground",
  "border",
  "border-strong",
  "input",
  "ring",
  "success",
  "success-bg",
  "warning",
  "warning-bg",
  "error",
  "error-bg",
  "info",
  "info-bg",
];
const BUTTON_VARIANTS = [
  "default",
  "secondary",
  "outline",
  "destructive",
  "ghost",
  "link",
] as const;
const BUTTON_SIZES = ["xs", "sm", "default", "lg"] as const;

function SubHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold">{children}</h3>;
}
function Description({ children }: { children: React.ReactNode }) {
  return (
    <p className="max-w-(--ui-width-reading) text-base text-muted-foreground">
      {children}
    </p>
  );
}
function Swatch({ name, value }: { name: string; value: string }) {
  return (
    <div className="min-w-0 space-y-2">
      <div
        className="aspect-square w-full rounded-sm border border-border"
        style={{ backgroundColor: value }}
      />
      <p className="break-all text-xs text-muted-foreground font-mono">
        {name}
      </p>
    </div>
  );
}
function ColorScale({
  name,
  colors,
}: {
  name: string;
  colors: Record<string, unknown>;
}) {
  return (
    <div className="space-y-3">
      <SubHeading>{name}</SubHeading>
      <div className="grid grid-cols-6 gap-3 sm:grid-cols-11">
        {valuesFrom(colors).map((color) => (
          <Swatch key={color.name} name={color.name} value={color.value} />
        ))}
      </div>
    </div>
  );
}
function InteractiveButton() {
  const t = useTranslations("design");
  const [variant, setVariant] =
    useState<(typeof BUTTON_VARIANTS)[number]>("default");
  const [size, setSize] = useState<(typeof BUTTON_SIZES)[number]>("default");
  const [disabled, setDisabled] = useState(false);

  return (
    <div className="space-y-6 rounded-lg border border-border bg-card p-6">
      <SubHeading>{t("interactive")}</SubHeading>
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-48 space-y-2">
          <label htmlFor="button-variant" className="text-base font-medium">
            variant
          </label>
          <Select
            value={variant}
            onValueChange={(value) => setVariant(value as typeof variant)}
          >
            <SelectTrigger id="button-variant">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUTTON_VARIANTS.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-40 space-y-2">
          <label htmlFor="button-size" className="text-base font-medium">
            size
          </label>
          <Select
            value={size}
            onValueChange={(value) => setSize(value as typeof size)}
          >
            <SelectTrigger id="button-size">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BUTTON_SIZES.map((value) => (
                <SelectItem key={value} value={value}>
                  {value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <label className="inline-flex min-h-(--ui-touch-target) cursor-pointer items-center gap-3">
          <Checkbox
            checked={disabled}
            onCheckedChange={(checked) => setDisabled(checked === true)}
          />
          <span>{t("disabled")}</span>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4 border-t border-border pt-6">
        <Button variant={variant} size={size} disabled={disabled}>
          {t("preview")}
        </Button>
        <code className="break-all text-sm text-muted-foreground">
          variant=&quot;{variant}&quot; size=&quot;{size}&quot;
          {disabled ? " disabled" : ""}
        </code>
      </div>
    </div>
  );
}
function InteractiveInput() {
  const t = useTranslations("design");
  const [disabled, setDisabled] = useState(false);
  const [invalid, setInvalid] = useState(false);
  return (
    <div className="space-y-6 rounded-lg border border-border bg-card p-6">
      <SubHeading>{t("interactive")}</SubHeading>
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex min-h-(--ui-touch-target) cursor-pointer items-center gap-3">
          <Checkbox
            checked={disabled}
            onCheckedChange={(checked) => setDisabled(checked === true)}
          />
          <span>{t("disabled")}</span>
        </label>
        <label className="inline-flex min-h-(--ui-touch-target) cursor-pointer items-center gap-3">
          <Checkbox
            checked={invalid}
            onCheckedChange={(checked) => setInvalid(checked === true)}
          />
          <span>{t("invalid")}</span>
        </label>
      </div>
      <div className="max-w-(--ui-width-short-form) space-y-2">
        <label htmlFor="preview-input" className="font-medium">
          {t("inputLabel")}
        </label>
        <Input
          id="preview-input"
          disabled={disabled}
          aria-invalid={invalid || undefined}
          aria-describedby="preview-input-help"
        />
        <p
          id="preview-input-help"
          className={`text-sm ${invalid ? "text-error" : "text-muted-foreground"}`}
          aria-live="polite"
        >
          {t(invalid ? "inputError" : "inputHelp")}
        </p>
      </div>
    </div>
  );
}

export default function DesignPage() {
  const t = useTranslations("design");
  return (
    <div className="mx-auto w-full max-w-(--ui-width-list) space-y-16 px-6 pb-24">
      <section className="flex flex-col-reverse items-start gap-8 pb-4 sm:flex-row sm:justify-between">
        <div className="min-w-0 flex-1">
          <PageTitle className="mb-3">{t("title")}</PageTitle>
          <Description>{t("subtitle")}</Description>
          <div className="mt-6 flex flex-wrap gap-2">
            {["React", "Tailwind v4", "OKLCH", "shadcn/ui"].map((tag) => (
              <Badge key={tag} variant="outline">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="min-h-(--ui-touch-target)">
              <a
                href="https://github.com/naeil-dev/naeil-ui"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub
                <ArrowUpRight aria-hidden="true" />
              </a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="min-h-(--ui-touch-target)"
            >
              <a
                href="https://www.npmjs.com/package/@naeil/ui"
                target="_blank"
                rel="noopener noreferrer"
              >
                npm
                <ArrowUpRight aria-hidden="true" />
              </a>
            </Button>
          </div>
        </div>
        <Image
          src="/images/whale.png"
          alt=""
          width={220}
          height={220}
          sizes="(max-width: 640px) 160px, 220px"
          className="w-40 shrink-0 object-contain sm:w-56"
        />
      </section>

      <section className="space-y-6">
        <SectionTitle>{t("foundations")}</SectionTitle>
        <Description>{t("neutralDescription")}</Description>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-3">
            <SubHeading>{t("neutralAction")}</SubHeading>
            <Button>{t("preview")}</Button>
            <code className="block text-sm text-muted-foreground">
              primary / primary-foreground
            </code>
          </div>
          <div className="space-y-3">
            <SubHeading>{t("selectedSurface")}</SubHeading>
            <div className="rounded-md bg-surface-selected px-4 py-2 text-foreground">
              {t("preview")}
            </div>
            <code className="block text-sm text-muted-foreground">
              surface-selected / foreground
            </code>
          </div>
          <div className="space-y-3">
            <SubHeading>{t("focusIndicator")}</SubHeading>
            <div className="rounded-md border-2 border-ring px-4 py-2">
              {t("preview")}
            </div>
            <code className="block text-sm text-muted-foreground">ring</code>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle>Colors — Semantic</SectionTitle>
        <Description>{t("semanticDescription")}</Description>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-4 lg:grid-cols-7">
          {SEMANTIC_TOKENS.map((token) => (
            <Swatch key={token} name={token} value={`var(--${token})`} />
          ))}
        </div>
      </section>
      <section className="space-y-6">
        <SectionTitle>Colors — Primitive</SectionTitle>
        <Description>{t("primitiveDescription")}</Description>
        <ColorScale name="Gray" colors={colorTokens.color.gray} />
        <ColorScale name={t("legacyBlue")} colors={colorTokens.color.accent} />
        <ColorScale name="Destructive" colors={colorTokens.color.destructive} />
      </section>
      <section className="space-y-6">
        <SectionTitle>Colors — Project</SectionTitle>
        <Description>{t("projectDescription")}</Description>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
          {valuesFrom(colorTokens.color.project).map((color) => (
            <Swatch key={color.name} name={color.name} value={color.value} />
          ))}
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle>Typography</SectionTitle>
        <Description>{t("typeDescription")}</Description>
        <div className="space-y-4 border-y border-border py-6">
          <p className={pageTitleClass}>{t("pageTitleSample")}</p>
          <p className="text-sm text-muted-foreground font-mono">
            PageTitle · {typeTokens.font.size["3xl"].$value} ·{" "}
            {typeTokens.font.weight.semibold.$value}
          </p>
          <p className={sectionTitleClass}>{t("sectionTitleSample")}</p>
          <p className="text-sm text-muted-foreground font-mono">
            SectionTitle · {typeTokens.font.size.xl.$value} ·{" "}
            {typeTokens.font.weight.semibold.$value}
          </p>
        </div>
        <div className="space-y-4">
          {valuesFrom(typeTokens.font.size).map((size) => (
            <div
              key={size.name}
              className="flex flex-wrap items-baseline gap-x-6 gap-y-2"
            >
              <code className="w-36 shrink-0 text-sm text-muted-foreground">
                {size.name} · {size.value}
              </code>
              <span
                className="min-w-0 break-words"
                style={{
                  fontSize: size.value,
                  lineHeight: typeTokens.font.lineHeight.normal.$value,
                }}
              >
                {t("typeSample")}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-3">
          <SubHeading>{t("monoStack")}</SubHeading>
          <p className="break-words text-sm text-muted-foreground">
            {typeTokens.font.family.mono.$value.join(", ")}
          </p>
          <p className="font-mono text-base">const x = 42;</p>
        </div>
        <div className="space-y-2">
          <p className="font-normal">400 Regular — {t("regularRole")}</p>
          <p className="font-medium">500 Medium — {t("mediumRole")}</p>
          <p className="font-semibold">600 Semibold — {t("semiboldRole")}</p>
        </div>
      </section>
      <section className="space-y-6">
        <SectionTitle>Spacing</SectionTitle>
        <div className="space-y-3">
          {valuesFrom(spacingTokens.spacing).map((spacing) => (
            <div key={spacing.name} className="flex items-center gap-4">
              <code className="w-6 shrink-0 text-sm text-muted-foreground">
                {spacing.name}
              </code>
              <div
                className="h-3 rounded-sm bg-primary"
                style={{ width: spacing.value }}
              />
              <code className="text-sm text-muted-foreground">
                {spacing.value}
              </code>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-6">
        <SectionTitle>Radius</SectionTitle>
        <Description>{t("radiusDescription")}</Description>
        <div className="flex flex-wrap gap-6">
          {valuesFrom(radiusTokens.radius).map((radius) => (
            <div key={radius.name} className="space-y-2">
              <div
                className="size-16 bg-primary"
                style={{ borderRadius: radius.value }}
              />
              <code className="text-sm text-muted-foreground">
                {radius.name} · {radius.value}
              </code>
            </div>
          ))}
        </div>
      </section>
      <section className="space-y-6">
        <SectionTitle>Shadow</SectionTitle>
        <div className="flex flex-wrap gap-6">
          <div className="space-y-3">
            <div className="size-24 rounded-lg bg-card shadow-sm" />
            <code className="text-sm text-muted-foreground">shadow-sm</code>
          </div>
          <div className="space-y-3">
            <div className="size-24 rounded-lg bg-card shadow-md" />
            <code className="text-sm text-muted-foreground">shadow-md</code>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <SectionTitle>Button</SectionTitle>
        <InteractiveButton />
        <SubHeading>{t("variants")}</SubHeading>
        <div className="flex flex-wrap gap-3">
          {BUTTON_VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
        <SubHeading>{t("sizes")}</SubHeading>
        <div className="flex flex-wrap items-center gap-3">
          {BUTTON_SIZES.map((size) => (
            <Button key={size} size={size} className="min-w-(--ui-touch-target)">
              {size}
            </Button>
          ))}
        </div>
        <SubHeading>{t("states")}</SubHeading>
        <div className="flex flex-wrap gap-3">
          <Button disabled>{t("disabled")}</Button>
          <Button variant="outline" disabled>
            {t("disabled")}
          </Button>
          <Button disabled aria-busy="true">
            {t("loading")}
          </Button>
        </div>
      </section>
      <section className="space-y-6">
        <SectionTitle>Input</SectionTitle>
        <InteractiveInput />
        <div className="max-w-(--ui-width-short-form) space-y-2">
          <label htmlFor="email-example" className="font-medium">
            {t("emailLabel")}
          </label>
          <Input
            id="email-example"
            type="email"
            placeholder={t("emailPlaceholder")}
          />
        </div>
      </section>
      <section className="space-y-6">
        <SectionTitle>Card</SectionTitle>
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t("systemTitle")}</CardTitle>
              <CardDescription>{t("systemDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p>{t("systemBody")}</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline">{t("details")}</Button>
            </CardFooter>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t("deploymentTitle")}</CardTitle>
              <CardDescription>{t("deploymentDescription")}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm text-muted-foreground font-mono">
                <p>v0.6.0 — Phase 6 Demo</p>
                <p>v0.5.0 — Core Components</p>
              </div>
            </CardContent>
          </Card>
        </div>
        <SubHeading>CardElevated</SubHeading>
        <CardElevated className="max-w-(--ui-width-settings)">
          <CardHeader>
            <CardTitle>CardElevated</CardTitle>
            <CardDescription>{t("raisedDescription")}</CardDescription>
          </CardHeader>
        </CardElevated>
      </section>
      <section className="space-y-6">
        <SectionTitle>Dialog</SectionTitle>
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">{t("openDialog")}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("confirmTitle")}</DialogTitle>
              <DialogDescription>{t("confirmDescription")}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">{t("cancel")}</Button>
              </DialogClose>
              <DialogClose asChild>
                <Button>{t("confirm")}</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
      <section className="space-y-6">
        <SectionTitle>DropdownMenu</SectionTitle>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">{t("openMenu")}</Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>{t("actions")}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>{t("profile")}</DropdownMenuItem>
            <DropdownMenuItem>{t("settings")}</DropdownMenuItem>
            <DropdownMenuItem>{t("team")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive">
              {t("signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </section>
      <section className="space-y-6">
        <SectionTitle>Sonner (Toast)</SectionTitle>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => toast.success(t("toastSuccess"))}
          >
            Success
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.error(t("toastError"))}
          >
            Error
          </Button>
          <Button variant="outline" onClick={() => toast.info(t("toastInfo"))}>
            Info
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.warning(t("toastWarning"))}
          >
            Warning
          </Button>
        </div>
      </section>
      <section className="space-y-6">
        <SectionTitle>Badge</SectionTitle>
        <div className="flex flex-wrap gap-3">
          <Badge>Default</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </section>
      <section className="space-y-6">
        <SectionTitle>Avatar</SectionTitle>
        <SubHeading>{t("sizes")}</SubHeading>
        <div className="flex items-center gap-4">
          <Avatar size="sm">
            <AvatarFallback>S</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarImage src="https://github.com/shadcn.png" alt="shadcn" />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>LG</AvatarFallback>
          </Avatar>
        </div>
        <SubHeading>AvatarBadge</SubHeading>
        <div className="flex items-center gap-4">
          <Avatar>
            <AvatarFallback>SC</AvatarFallback>
            <AvatarBadge />
          </Avatar>
          <Avatar size="lg">
            <AvatarFallback>JM</AvatarFallback>
            <AvatarBadge />
          </Avatar>
        </div>
        <SubHeading>AvatarGroup</SubHeading>
        <AvatarGroup>
          <Avatar>
            <AvatarFallback>A</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>B</AvatarFallback>
          </Avatar>
          <Avatar>
            <AvatarFallback>C</AvatarFallback>
          </Avatar>
          <AvatarGroupCount>+5</AvatarGroupCount>
        </AvatarGroup>
      </section>
    </div>
  );
}
