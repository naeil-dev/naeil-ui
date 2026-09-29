"use client";

import * as React from "react";
import { Select as Primitive } from "radix-ui";
import { CheckIcon, ChevronDownIcon, ChevronUpIcon } from "lucide-react";
import { cn } from "../../lib/utils";

const Select = Primitive.Root;
const SelectValue = Primitive.Value;
const SelectGroup = Primitive.Group;

function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "ui-control ui-focus flex w-full items-center justify-between gap-2 border border-input bg-background px-3 text-left text-foreground disabled:cursor-not-allowed disabled:opacity-45 data-[placeholder]:text-muted-foreground [&>span]:min-w-0 [&>span]:truncate",
        className,
      )}
      {...props}
    >
      {children}
      <Primitive.Icon asChild>
        <ChevronDownIcon className="size-4 shrink-0" />
      </Primitive.Icon>
    </Primitive.Trigger>
  );
}

function SelectContent({
  className,
  children,
  position = "popper",
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        data-slot="select-content"
        position={position}
        sideOffset={sideOffset}
        className={cn(
          "ui-menu ui-popup z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) max-w-[calc(100vw-24px)] overflow-hidden",
          className,
        )}
        {...props}
      >
        <SelectScrollUpButton />
        <Primitive.Viewport className="p-1">{children}</Primitive.Viewport>
        <SelectScrollDownButton />
      </Primitive.Content>
    </Primitive.Portal>
  );
}

function SelectItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      data-slot="select-item"
      className={cn(
        "relative flex cursor-default items-center rounded-sm py-2 pr-9 pl-3 text-base outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-45",
        className,
      )}
      {...props}
    >
      <Primitive.ItemText>{children}</Primitive.ItemText>
      <Primitive.ItemIndicator className="absolute right-3">
        <CheckIcon className="size-4" />
      </Primitive.ItemIndicator>
    </Primitive.Item>
  );
}

function SelectLabel({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Label>) {
  return (
    <Primitive.Label
      data-slot="select-label"
      className={cn(
        "px-3 py-2 text-sm font-medium text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
function SelectSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Separator>) {
  return (
    <Primitive.Separator
      data-slot="select-separator"
      className={cn("my-1 h-px bg-border", className)}
      {...props}
    />
  );
}
function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.ScrollUpButton>) {
  return (
    <Primitive.ScrollUpButton
      className={cn("flex h-8 items-center justify-center", className)}
      {...props}
    >
      <ChevronUpIcon className="size-4" />
    </Primitive.ScrollUpButton>
  );
}
function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.ScrollDownButton>) {
  return (
    <Primitive.ScrollDownButton
      className={cn("flex h-8 items-center justify-center", className)}
      {...props}
    >
      <ChevronDownIcon className="size-4" />
    </Primitive.ScrollDownButton>
  );
}

export {
  Select,
  SelectValue,
  SelectGroup,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};
