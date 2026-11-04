import { describe, expect, it } from "vitest";
import { createSiteState } from "../site-state";

describe("Site auth state lifetime", () => {
  it("retains raw credentials and the synchronous request lock across locale presentation mounts", () => {
    const store = createSiteState();
    const initial = { password: "", busy: false, status: "" };
    const first = store.cell("credentials:/login:/", initial, "/login");
    first.set({ password: "partial input", busy: true, status: "" });
    store.enterRoute("/login");
    const remount = store.cell("credentials:/login:/", initial, "/login");
    expect(remount).toBe(first);
    expect(remount.get()).toEqual({ password: "partial input", busy: true, status: "" });
    first.set(current => ({ ...current, busy: false, status: "error", password: "" }));
    expect(remount.get().status).toBe("error");
  });
  it("discards credentials on logical departure and rejects a stale asynchronous completion", () => {
    const store = createSiteState();
    const cell = store.cell("credentials", { password: "", busy: false }, "/login");
    cell.set({ password: "secret", busy: true });
    store.enterRoute("/blog");
    expect(cell.active).toBe(false);
    expect(cell.get().password).toBe("");
    cell.set({ password: "late result", busy: true });
    expect(cell.get()).toEqual({ password: "", busy: false });
  });
  it("clears forms and account locks only on an observed account change", () => {
    const store = createSiteState();
    store.observeSession("user-a");
    const cell = store.cell("password-change", "", "/login/change-password");
    const request = store.cell("account:user-a", false);
    cell.set("draft"); request.set(true);
    store.observeSession("user-a");
    expect(cell.get()).toBe("draft");
    expect(request.get()).toBe(true);
    store.observeSession(null);
    expect(cell.get()).toBe("draft");
    expect(request.get()).toBe(true);
    store.observeSession("user-b");
    expect(cell.active).toBe(false);
    expect(request.active).toBe(false);
    expect(cell.get()).toBe("");
  });
  it("disposes pending requests when the validated login destination changes, retaining locale-only mounts", () => {
    const store = createSiteState();
    const first = store.cell("oauth:a", { pending: true }, "/login", value => value.pending, "/blog?a");
    store.enterScope("/login", "/blog?a");
    expect(first.active).toBe(true);
    store.enterScope("/login", "/blog?b");
    expect(first.active).toBe(false);
    expect(store.unsafeToLeave()).toBe(false);
  });
  it("clears every credential and lock before an explicit logout departure", () => {
    const store = createSiteState();
    store.observeSession("user-a");
    const draft = store.cell<string>("credentials", "", "/login/change-password", Boolean);
    const request = store.cell("account-request", false);
    draft.set("secret"); request.set(true);
    store.resetSession();
    expect(draft.get()).toBe("");
    expect(draft.active).toBe(false);
    expect(request.active).toBe(false);
    expect(store.unsafeToLeave()).toBe(false);
    store.observeSession("user-a");
    expect(store.cell("credentials", "", "/login/change-password").get()).toBe("");
  });
});
