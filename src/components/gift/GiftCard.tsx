"use client";

import { format } from "date-fns";
import { useRouter } from "next/navigation";
import type { Gift } from "@/types";
import { GiftStatusBadge } from "@/components/ui/GiftStatusBadge";
import styles from "./GiftCard.module.css";

interface GiftCardProps {
  gift: Gift;
  perspective: "sender" | "recipient";
}

export function GiftCard({ gift, perspective }: GiftCardProps) {
  const router = useRouter();
  const isLocked = gift.status === "locked";
  const name =
    perspective === "sender" ? `To: ${gift.recipientName}` : "A gift for you";

  const amountLabel =
    isLocked && perspective === "recipient"
      ? "amount hidden"
      : `₦${gift.amountNgn.toLocaleString("en-NG")}`;

  const unlockLabel = `${isLocked ? "Unlocks" : "Unlocked"} ${format(
    new Date(gift.unlockAt),
    "MMM d, yyyy 'at' h:mm a"
  )}`;

  const cardLabel = [
    name,
    amountLabel,
    unlockLabel,
    gift.status,
  ].join(", ");

  const handleActivate = () => {
    router.push(`/gifts/${gift.id}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleActivate();
    }
  };

  return (
    <article
      className={styles.card}
      tabIndex={0}
      role="button"
      aria-label={cardLabel}
      onClick={handleActivate}
      onKeyDown={handleKeyDown}
    >
      <div className={styles.header}>
        <span className={styles.name}>{name}</span>
        <GiftStatusBadge status={gift.status} />
      </div>

      <div className={styles.amount} aria-hidden="true">
        {isLocked && perspective === "recipient" ? (
          <span className={styles.hidden}>₦ ••••••</span>
        ) : (
          <span>₦{gift.amountNgn.toLocaleString("en-NG")}</span>
        )}
      </div>

      <div className={styles.meta} aria-hidden="true">
        <span>{unlockLabel}</span>
      </div>

      {gift.message && !isLocked && (
        <p className={styles.message}>{gift.message}</p>
      )}
    </article>
  );
}
