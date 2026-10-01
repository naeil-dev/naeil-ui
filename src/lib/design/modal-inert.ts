"use client";
import { useEffect, useMemo, useState, type Ref, type RefObject } from "react";

// Radix hideOthers marks outside branches aria-hidden, but they can still be
// programmatically focused. Share ownership across overlapping/nested wrappers.
type Ownership = WeakMap<HTMLElement, { users: number; original: boolean }>;
const ownershipKey = Symbol.for("@naeil/ui/radix-hidden-inert/v1");
function ownershipFor(doc: Document): Ownership {
  // The same document can host bundled /ui and deep imports, or more than one
  // installed copy. A document-owned registry coordinates those module copies
  // without touching server globals or retaining elements after removal.
  const shared = doc as Document & { [ownershipKey]?: Ownership };
  return shared[ownershipKey] ??= new WeakMap();
}

export function useRadixHiddenInert(content: HTMLElement | null) {
  useEffect(() => {
    if (!content) return;
    const doc = content.ownerDocument;
    const ownership = ownershipFor(doc);
    const held = new Set<HTMLElement>();
    function release(element: HTMLElement) {
      held.delete(element);
      const state = ownership.get(element);
      if (!state || --state.users > 0) return;
      element.inert = state.original;
      ownership.delete(element);
    }
    function sync() {
      const hidden = content?.isConnected && content.dataset.state === "open"
        ? [...doc.querySelectorAll<HTMLElement>('[data-aria-hidden="true"][aria-hidden="true"]')]
          .filter(element => !element.contains(content))
        : [];
      const desired = new Set(hidden);
      for (const element of held) if (!desired.has(element)) release(element);
      for (const element of desired) {
        if (held.has(element)) continue;
        let state = ownership.get(element);
        if (!state) {
          state = { users: 0, original: element.inert };
          ownership.set(element, state);
        }
        state.users++;
        held.add(element);
        element.inert = true;
      }
    }
    const observer = new MutationObserver(sync);
    observer.observe(doc.body, { subtree: true, childList: true, attributes: true,
      attributeFilter: ["aria-hidden", "data-aria-hidden", "data-state"] });
    sync();
    return () => {
      observer.disconnect();
      for (const element of held) release(element);
    };
  }, [content]);
}

function assignObjectRef<T>(ref: RefObject<T | null>, node: T | null) {
  ref.current = node;
}

// React 19 callback-ref cleanup and object refs remain forwarded. The stable
// callback gives the inert coordinator only the mounted primitive DOM node.
export function useOverlayRef<T extends HTMLElement>(consumerRef: Ref<T> | undefined) {
  const [node, setNode] = useState<T | null>(null);
  const ref = useMemo(() => (value: T | null) => {
    setNode(value);
    const cleanup = typeof consumerRef === "function" ? consumerRef(value) : undefined;
    if (consumerRef && typeof consumerRef !== "function") assignObjectRef(consumerRef, value);
    return () => {
      setNode(null);
      if (typeof cleanup === "function") cleanup();
      else if (typeof consumerRef === "function") consumerRef(null);
      else if (consumerRef) assignObjectRef(consumerRef, null);
    };
  }, [consumerRef]);
  return [node, ref] as const;
}
