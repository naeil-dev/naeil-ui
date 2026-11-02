"use client";
import { useId, useRef, useState } from "react";
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
}: {
  next?: string;
  change?: boolean;
}) {
  const t = useTranslations("auth"),
    locale = useLocale(),
    form = useRef<HTMLFormElement>(null),
    lock = useRef(false),
    statusId = useId();
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState(""),
    [email, setEmail] = useState("");
  async function run(
    kind: "password" | "email" | "change" | "resume" | "code",
    data: FormData,
  ) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setStatus("");
    try {
      let result;
      if (kind === "change") {
        const start = await beginPasswordChange();
        result =
          start.status === "ready" ? await submitPasswordChange(data) : start;
      } else if (kind === "code") result = await requestPasswordCode();
      else if (kind === "resume") result = await resumePasswordChange();
      else
        result =
          kind === "email" ? await emailLogin(data) : await passwordLogin(data);
      clearSensitive();
      if ("location" in result && typeof result.location === "string")
        window.location.assign(result.location);
      else setStatus(result.status === "ready" ? "" : result.status);
    } catch {
      clearSensitive();
      setStatus(change ? "retry" : "error");
    } finally {
      lock.current = false;
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
  };
  const blocked = change && (status === "retry" || status === "reissued");
  const invalid = ["error", "invalidEmail", "rejected"].includes(status);
  function clearSensitive() {
    form.current
      ?.querySelectorAll<HTMLInputElement>(
        'input[type="password"], input[name="nonce"]',
      )
      .forEach((input) => {
        input.value = "";
      });
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
              onChange={(event) => setEmail(event.target.value)}
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
            <label className="block space-y-2">
              <span>{t("reauthCode")}</span>
              <Input
                name="nonce"
                autoComplete="one-time-code"
                maxLength={128}
                aria-describedby={statusId}
                aria-invalid={invalid || undefined}
                disabled={busy || blocked}
              />
            </label>
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
        {!change && (
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
            if (lock.current) return;
            lock.current = true;
            setBusy(true);
            clearSensitive();
            try {
              await leavePasswordChange();
              window.location.assign(`/${locale}/login`);
            } catch {
              lock.current = false;
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
