import { format } from "date-fns";
import type { Gift } from "@/types";
import { GiftStatusBadge } from "@/components/ui/GiftStatusBadge";
import styles from "./GiftCard.module.css";

interface GiftCardProps {
  gift: Gift;
  perspective: "sender" | "recipient";
}

export function GiftCard({ gift, perspective }: GiftCardProps) {
  const isLocked = gift.status === "locked";
  const name =
    perspective === "sender" ? `To: ${gift.recipientName}` : "A gift for you";

  return (
    <article className={styles.card}>
      <div className={styles.header}>
        <span className={styles.name}>{name}</span>
        <GiftStatusBadge status={gift.status} />
      </div>

      <div className={styles.amount}>
        {isLocked && perspective === "recipient" ? (
          <span className={styles.hidden}>₦ ••••••</span>
        ) : (
          <span>₦{gift.amountNgn.toLocaleString("en-NG")}</span>
        )}
      </div>

      <div className={styles.meta}>
        <span>
          {isLocked ? "Unlocks" : "Unlocked"}{" "}
          {format(new Date(gift.unlockAt), "MMM d, yyyy 'at' h:mm a")}
        </span>
      </div>

      {gift.message && !isLocked && (
        <p className={styles.message}>{gift.message}</p>
      )}
    </article>
  );
}
