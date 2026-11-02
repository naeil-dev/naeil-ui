"use client";
import { useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clearLocalSession } from "./actions";
import {
  passwordLogin,
  emailLogin,
  beginPasswordChange,
  submitPasswordChange,
  resumePasswordChange,
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
    lock = useRef(false);
  const [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  async function run(
    kind: "password" | "email" | "change" | "resume",
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
      } else if (kind === "resume") result = await resumePasswordChange();
      else
        result =
          kind === "email" ? await emailLogin(data) : await passwordLogin(data);
      form.current?.reset();
      if ("location" in result && typeof result.location === "string")
        window.location.assign(result.location);
      else setStatus(result.status);
    } catch {
      form.current?.reset();
      setStatus(change ? "retry" : "error");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const messages: Record<string, string> = {
    error: "credentialError",
    expired: "tempExpired",
    reissued: "tempReissued",
    retry: "completionRetry",
    sent: "emailSent",
    rejected: "passwordRejected",
  };
  return (
    <div className="space-y-4">
      {status && (
        <p
          role="status"
          aria-live="polite"
          className="rounded-md bg-surface-subtle p-4 text-sm"
        >
          {t(messages[status] || "credentialError")}
        </p>
      )}
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
              type="email"
              autoComplete="username"
              required
              maxLength={254}
              disabled={busy}
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
              disabled={busy}
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
            disabled={busy || status === "retry" || status === "reissued"}
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
                disabled={busy}
              />
            </label>
            <label className="block space-y-2">
              <span>{t("reauthCode")}</span>
              <Input
                name="nonce"
                autoComplete="one-time-code"
                maxLength={128}
                disabled={busy}
              />
            </label>
          </>
        )}
        <Button
          type="submit"
          size="lg"
          className="w-full whitespace-normal"
          disabled={busy || status === "retry" || status === "reissued"}
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
          onClick={async () => {
            await clearLocalSession();
            window.location.assign(`/${locale}/login`);
          }}
        >
          {t("backToLogin")}
        </Button>
      )}
    </div>
  );
}
