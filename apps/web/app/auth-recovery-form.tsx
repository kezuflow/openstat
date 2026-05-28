"use client";

import Link from "next/link";
import {
  Button,
  FieldError,
  Form,
  Input,
  Label,
  TextField,
} from "@heroui/react";
import { useState } from "react";

import { authBaseURL } from "../lib/auth-client";

type RecoveryMode = "forgot-password" | "reset-password";

type AuthRecoveryFormProps = {
  mode: RecoveryMode;
  token?: string;
};

export function AuthRecoveryForm({ mode, token }: AuthRecoveryFormProps) {
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [isPending, setIsPending] = useState(false);

  async function requestReset(formData: FormData) {
    setError(undefined);
    setMessage(undefined);
    setIsPending(true);

    try {
      const response = await fetch(`${authBaseURL}/request-password-reset`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: String(formData.get("email") ?? "").trim(),
          redirectTo: `${window.location.origin}/reset-password`,
        }),
      });

      if (!response.ok) {
        setError("Could not send a password reset email.");
        return;
      }

      setMessage("Check your email for the reset link.");
    } catch {
      setError("Could not reach the OpenStat API.");
    } finally {
      setIsPending(false);
    }
  }

  async function resetPassword(formData: FormData) {
    setError(undefined);
    setMessage(undefined);
    setIsPending(true);

    try {
      const response = await fetch(`${authBaseURL}/reset-password`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          newPassword: String(formData.get("password") ?? ""),
          token,
        }),
      });

      if (!response.ok) {
        setError(
          "Could not reset your password. Request a new link and try again.",
        );
        return;
      }

      setMessage("Password reset. You can sign in now.");
    } catch {
      setError("Could not reach the OpenStat API.");
    } finally {
      setIsPending(false);
    }
  }

  const isReset = mode === "reset-password";

  return (
    <main className="signin-page">
      <section
        className="signin-recovery-panel"
        aria-labelledby="recovery-title"
      >
        <header className="signin-header">
          <h1 id="recovery-title">
            {isReset ? "Reset your password" : "Recover your account"}
          </h1>
          <p>
            <Link className="signin-mode-link" href="/sign-in">
              Back to sign in
            </Link>
          </p>
        </header>

        <Form
          className="signin-form"
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);

            if (isReset) {
              void resetPassword(formData);
              return;
            }

            void requestReset(formData);
          }}
        >
          {isReset ? (
            <TextField
              isDisabled={!token}
              isRequired
              minLength={8}
              name="password"
              type="password"
            >
              <Label>New password</Label>
              <Input
                autoComplete="new-password"
                fullWidth
                placeholder="New password"
                variant="secondary"
              />
              <FieldError />
            </TextField>
          ) : (
            <TextField isRequired name="email" type="email">
              <Label>Email</Label>
              <Input
                autoComplete="email"
                fullWidth
                placeholder="Email address"
                variant="secondary"
              />
              <FieldError />
            </TextField>
          )}

          {!token && isReset ? (
            <p className="signin-error">This reset link is missing a token.</p>
          ) : null}
          {error ? <p className="signin-error">{error}</p> : null}
          {message ? <p className="signin-success">{message}</p> : null}

          <Button
            fullWidth
            isDisabled={isReset && !token}
            isPending={isPending}
            type="submit"
            variant="primary"
          >
            {isReset ? "Reset password" : "Email reset link"}
          </Button>
        </Form>
      </section>
    </main>
  );
}
