"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createGiftSchema, type CreateGiftInput } from "@/types/schemas";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { GiftPreview } from "./GiftPreview";
import { useState } from "react";
import styles from "./CreateGiftForm.module.css";

type Step = "form" | "preview";

export function CreateGiftForm() {
  const [step, setStep] = useState<Step>("form");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usdcEquivalent, setUsdcEquivalent] = useState("…");

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<CreateGiftInput>({
    resolver: zodResolver(createGiftSchema),
    defaultValues: { paymentProvider: "paystack" },
  });

  // Step 1 → Step 2: fetch USDC estimate then show preview
  const onFormSubmit = async (data: CreateGiftInput) => {
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/exchange-rate?ngn=${data.amountNgn}`
      );
      if (res.ok) {
        const json = await res.json();
        setUsdcEquivalent(json.data?.usdc ?? "—");
      }
    } catch {
      // non-critical — preview still shows without USDC estimate
    }
    setStep("preview");
  };

  // Step 2 → Payment: submit to API
  const onConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = getValues();
      const res = await fetch("/api/v1/gifts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      window.location.href = json.data.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  if (step === "preview") {
    return (
      <GiftPreview
        data={getValues()}
        usdcEquivalent={usdcEquivalent}
        onEdit={() => setStep("form")}
        onConfirm={onConfirm}
        loading={loading}
        error={error}
      />
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit(onFormSubmit)} noValidate>
      <h2 className={styles.title}>Send a Gift</h2>

      <Input
        label="Recipient's Name"
        placeholder="e.g. Amara"
        error={errors.recipientName?.message}
        {...register("recipientName")}
      />

      <Input
        label="Recipient's Phone"
        type="tel"
        placeholder="+2348012345678"
        error={errors.recipientPhone?.message}
        {...register("recipientPhone")}
      />

      <Input
        label="Gift Amount (₦)"
        type="number"
        placeholder="5000"
        min={500}
        error={errors.amountNgn?.message}
        {...register("amountNgn", { valueAsNumber: true })}
      />

      <Input
        label="Unlock Date & Time"
        type="datetime-local"
        error={errors.unlockAt?.message}
        {...register("unlockAt")}
      />

      <div className="input-group">
        <label className="input-label" htmlFor="message">
          Personal Message (optional)
        </label>
        <textarea
          id="message"
          className="input"
          rows={3}
          placeholder="Write something heartfelt…"
          {...register("message")}
        />
        {errors.message && (
          <span className="input-error-msg">{errors.message.message}</span>
        )}
      </div>

      <Button type="submit" fullWidth>
        Preview Gift →
      </Button>
    </form>
  );
}
