"use client";
import { useId, useRef } from "react";
import { useCredentialDraft } from "@/components/site-session-state";
import { localePath, assertLocale } from "@/naeil-locale";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  passwordLogin,
  emailLogin,
  beginPasswordChange,
  submitPasswordChange,
  resumePasswordChange,
  leavePasswordChange,
  requestPasswordCode,
} from "./credential-actions";

export function CredentialForms({
  next = "/",
  change = false,
  emailEnabled = false,
}: {
  next?: string;
  change?: boolean;
  emailEnabled?: boolean;
}) {
  const t = useTranslations("site.auth"),
    locale = useLocale(),
    form = useRef<HTMLFormElement>(null),
    statusId = useId();
  const [draft, setDraft, cell] = useCredentialDraft(change, next);
  const { busy, status, email } = draft;
  const setStatus = (status: string) => setDraft(current => ({ ...current, status }));
  const setBusy = (busy: boolean) => setDraft(current => ({ ...current, busy }));
  const field = (name: "email" | "password" | "current_password" | "confirm" | "nonce", value: string) => setDraft(current => ({ ...current, [name]: value }));
  async function run(
    kind: "password" | "email" | "change" | "resume" | "code",
    data: FormData,
  ) {
    if (!cell.active || cell.get().busy) return;
    setBusy(true);
    setStatus("");
    try {
      let result;
      if (kind === "change") {
        const start = await beginPasswordChange();
        if (!cell.active) return;
        result =
          start.status === "ready" ? await submitPasswordChange(data) : start;
      } else if (kind === "code") result = await requestPasswordCode();
      else if (kind === "resume") result = await resumePasswordChange();
      else
        result =
          kind === "email" ? await emailLogin(data) : await passwordLogin(data);
      if (!cell.active) return;
      clearSensitive();
      if ("location" in result && typeof result.location === "string") {
        setDraft(current => ({ ...current, email: "", busy: false }));
        const currentLocale = assertLocale(document.documentElement.lang);
        const destination = "authPage" in result && result.authPage === "change-password"
          ? localePath("main", "/login/change-password", currentLocale)
          : change && result.location === "/" ? localePath("main", "/", currentLocale) : result.location;
        window.location.assign(destination);
      } else setStatus(result.status === "ready" ? "" : result.status);
    } catch {
      clearSensitive();
      setStatus(change ? "retry" : "error");
    } finally {
      setBusy(false);
    }
  }
  const messages: Record<string, string> = {
    error: "credentialError",
    invalidEmail: "invalidEmail",
    codeSent: "codeSent",
    expired: "tempExpired",
    reissued: "tempReissued",
    retry: "completionRetry",
    sent: "emailSent",
    rejected: "passwordRejected",
    mailPaused: change ? "reauthMailPaused" : "emailLoginPaused",
  };
  const blocked = change && (status === "retry" || status === "reissued");
  const invalid = ["error", "invalidEmail", "rejected"].includes(status);
  function clearSensitive() {
    setDraft(current => ({ ...current, password: "", current_password: "", confirm: "", nonce: "" }));
  }
  return (
    <div className="space-y-4">
      <p
        id={statusId}
        role="status"
        aria-live="polite"
        className={
          status ? "rounded-md bg-surface-subtle p-4 text-sm" : "sr-only"
        }
      >
        {status ? t(messages[status] || "credentialError") : ""}
      </p>
      <form
        ref={form}
        action={(data) => run(change ? "change" : "password", data)}
        className="space-y-4"
      >
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={next} />
        {!change && (
          <label className="block space-y-2">
            <span>{t("emailId")}</span>
            <Input
              name="email"
              value={email}
              onChange={(event) => field("email", event.target.value)}
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              aria-describedby={statusId}
              aria-invalid={invalid || undefined}
              disabled={busy || blocked}
            />
          </label>
        )}
        {change && (
          <label className="block space-y-2">
            <span>{t("currentPassword")}</span>
            <Input
              name="current_password"
              value={draft.current_password}
              onChange={event => field("current_password", event.target.value)}
              type="password"
              autoComplete="current-password"
              aria-describedby={statusId}
              aria-invalid={invalid || undefined}
              disabled={busy || blocked}
              maxLength={1024}
            />
          </label>
        )}
        <label className="block space-y-2">
          <span>{t(change ? "newPassword" : "password")}</span>
          <Input
            name="password"
              value={draft.password}
              onChange={event => field("password", event.target.value)}
            type="password"
            autoComplete={change ? "new-password" : "current-password"}
            required
            minLength={change ? 12 : 1}
            maxLength={change ? 72 : 1024}
            disabled={busy || blocked}
            aria-describedby={statusId}
            aria-invalid={invalid || undefined}
          />
        </label>
        {change && (
          <>
            <label className="block space-y-2">
              <span>{t("confirmPassword")}</span>
              <Input
                name="confirm"
              value={draft.confirm}
              onChange={event => field("confirm", event.target.value)}
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={72}
                aria-describedby={statusId}
                aria-invalid={invalid || undefined}
                disabled={busy || blocked}
              />
            </label>
            {emailEnabled && (
              <label className="block space-y-2">
                <span>{t("reauthCode")}</span>
                <Input
                  name="nonce"
              value={draft.nonce}
              onChange={event => field("nonce", event.target.value)}
                  autoComplete="one-time-code"
                  maxLength={128}
                  aria-describedby={statusId}
                  aria-invalid={invalid || undefined}
                  disabled={busy || blocked}
                />
              </label>
            )}
            {emailEnabled && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                size="lg"
                disabled={busy || blocked}
                onClick={() => void run("code", new FormData())}
              >
                {t("requestCode")}
              </Button>
            )}
          </>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full whitespace-normal"
          disabled={busy || blocked}
          aria-busy={busy}
        >
          {t(change ? "changePassword" : "passwordSignIn")}
        </Button>
        {!change && emailEnabled && (
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full whitespace-normal"
            disabled={busy}
            onClick={() => {
              if (
                !form.current
                  ?.querySelector<HTMLInputElement>('input[name="email"]')
                  ?.reportValidity()
              )
                return;
              const data = new FormData();
              data.set(
                "email",
                String(new FormData(form.current!).get("email") || ""),
              );
              data.set("locale", locale);
              data.set("next", next);
              void run("email", data);
            }}
          >
            {t("emailLoginLink")}
          </Button>
        )}
        {!emailEnabled && (
          <p className="text-sm text-muted-foreground">
            {t(change ? "reauthMailPaused" : "emailLoginPaused")}
          </p>
        )}
      </form>
      {change && status === "retry" && (
        <Button
          className="w-full"
          disabled={busy}
          onClick={() => void run("resume", new FormData())}
        >
          {t("retryCompletion")}
        </Button>
      )}
      {change && (
        <Button
          variant="link"
          disabled={busy}
          onClick={async () => {
            if (!cell.active || cell.get().busy) return;
            setBusy(true);
            clearSensitive();
            try {
              await leavePasswordChange();
              if (!cell.active) return;
              setDraft(current => ({ ...current, busy: false, email: "" }));
              window.location.assign(localePath("main", "/login", assertLocale(document.documentElement.lang)));
            } catch {
              setBusy(false);
              setStatus("error");
            }
          }}
        >
          {t("backToLogin")}
        </Button>
      )}
    </div>
  );
}
