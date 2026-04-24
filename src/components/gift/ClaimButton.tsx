"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import type { GiftStatus } from "@/types";
import styles from "./ClaimButton.module.css";

interface ClaimButtonProps {
  giftId: string;
  recipientStellarKey: string;
  onStatusChange: (status: GiftStatus) => void;
}

async function postClaim(giftId: string, recipientStellarKey: string): Promise<void> {
  const res = await fetch(`/api/v1/gifts/${giftId}/claim`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ giftId, recipientStellarKey }),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error ?? "Claim failed");
}

export function ClaimButton({ giftId, recipientStellarKey, onStatusChange }: ClaimButtonProps) {
  const [error, setError] = useState<string | null>(null);

  const { mutate, isPending } = useMutation({
    mutationFn: () => postClaim(giftId, recipientStellarKey),
    onMutate: () => {
      setError(null);
      onStatusChange("claiming" as GiftStatus);
    },
    onSuccess: () => {
      onStatusChange("claimed");
    },
    onError: (err: Error) => {
      onStatusChange("unlocked");
      setError(err.message);
    },
  });

  return (
    <div className={styles.wrapper}>
      <button
        className="btn btn--primary"
        onClick={() => mutate()}
        disabled={isPending}
        aria-busy={isPending}
      >
        {isPending ? <span className={styles.spinner} aria-hidden="true" /> : null}
        {isPending ? "Claiming…" : "Claim Gift"}
      </button>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </div>
  );
}
