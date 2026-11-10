"use client";

import {
  browserSupportsWebAuthn,
  type PublicKeyCredentialCreationOptionsJSON,
  startRegistration,
} from "@simplewebauthn/browser";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { describeWebAuthnError } from "../../_lib/webauthn-client";
import type { Notify } from "../../_lib/types";
import {
  finishPasskeyRegistration,
  startPasskeyRegistration,
} from "../../_server/auth/passkey-actions";
import { FingerprintIcon } from "../icons";
import { cx, primaryButtonClass } from "../ui";

/**
 * Оюутан анх удаа Face ID / хурууны хээгээ бүртгүүлнэ.
 * Safari товч дарсны дараа шууд WebAuthn дуудахыг шаарддаг тул
 * сонголтуудыг урьдчилан татаж бэлдэнэ.
 */
export function PasskeySetup({ notify }: { notify: Notify }) {
  const options = useRef<PublicKeyCredentialCreationOptionsJSON | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  /** Сонголтуудыг татна. Алдаа гарвал мессежийг буцаана. */
  const prepare = useCallback(async () => {
    const result = await startPasskeyRegistration();
    options.current = result.ok ? result.options : null;
    return result.ok ? "" : result.error;
  }, []);

  useEffect(() => {
    void prepare();
  }, [prepare]);

  const register = () =>
    startTransition(async () => {
      setError("");
      if (!browserSupportsWebAuthn()) {
        setError(describeWebAuthnError({ name: "NotSupportedError" }));
        return;
      }
      if (!options.current) {
        const prepareError = await prepare();
        if (prepareError) {
          setError(prepareError);
          return;
        }
      }
      const optionsJSON = options.current;
      if (!optionsJSON) return;
      options.current = null;
      try {
        const response = await startRegistration({ optionsJSON });
        const result = await finishPasskeyRegistration(response);
        if (result.ok) notify(result.message);
        else {
          setError(result.error);
          void prepare();
        }
      } catch (cause) {
        setError(describeWebAuthnError(cause, true));
        void prepare();
      }
    });

  return (
    <section className="rounded-xl border border-slate-200 bg-surface p-5 text-center">
      <span className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-50 text-emerald-700">
        <FingerprintIcon className="size-7" />
      </span>
      <h2 className="mt-3 text-xl font-semibold">
        Face ID / хурууны хээгээ бүртгүүлнэ үү
      </h2>
      <p className="mx-auto mt-1 max-w-sm text-[15px] text-slate-500">
        Ирц бүртгүүлэх бүрт үүгээр баталгаажуулна.
      </p>
      {error && (
        <p
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-left text-sm text-rose-800"
          role="alert"
        >
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={register}
        disabled={pending}
        className={cx(primaryButtonClass, "mt-5 w-full")}
      >
        <FingerprintIcon className="size-5" />
        {pending ? "Бүртгэж байна…" : "Бүртгүүлэх"}
      </button>
    </section>
  );
}
