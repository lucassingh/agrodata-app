"use client";

import { useActionState, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { verifyCodeAction, resendCodeAction } from "./actions";

interface VerifyFormProps {
  wNumber: string;
  initialMockCode?: string;
}

export function VerifyForm({ wNumber, initialMockCode }: VerifyFormProps) {
  const [code, setCode] = useState("");
  const [mockCode, setMockCode] = useState(initialMockCode);
  const [resendPending, startResend] = useTransition();
  const [errorMessage, formAction, isPending] = useActionState(
    verifyCodeAction,
    undefined,
  );

  return (
    <div className="space-y-4">
      {mockCode ? (
        <p className="rounded-md bg-accent px-3 py-2 text-sm text-accent-foreground">
          Código de prueba (dev): <span className="font-mono font-bold">{mockCode}</span>
        </p>
      ) : null}

      <form action={formAction} className="space-y-4">
        <input type="hidden" name="wNumber" value={wNumber} />
        <input type="hidden" name="code" value={code} />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoFocus
          className="w-full rounded-md border border-input bg-background px-3 py-3 text-center font-mono text-2xl tracking-[0.5em] outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          placeholder="------"
        />
        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}
        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={isPending || code.length !== 6}
        >
          {isPending ? "Verificando..." : "Verificar"}
        </Button>
      </form>

      <Button
        type="button"
        variant="ghost"
        className="w-full"
        disabled={resendPending}
        onClick={() =>
          startResend(async () => {
            const result = await resendCodeAction(wNumber);
            if (result.success) setMockCode(result.mockCode);
          })
        }
      >
        {resendPending ? "Reenviando..." : "Reenviar código"}
      </Button>
    </div>
  );
}
