import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getGiftsBySender } from "@/server/services/gift.service";
import { GiftCard } from "@/components/gift/GiftCard";
import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/auth/login");

  const userId = (session.user as { id: string }).id;
  const gifts = await getGiftsBySender(userId);

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>Your Gifts</h1>

        {gifts.length === 0 ? (
          <div className={styles.empty}>
            <p>You haven&apos;t sent any gifts yet.</p>
            <a href="/send" className="btn btn--primary">
              Send your first gift
            </a>
          </div>
        ) : (
          <div className={styles.grid}>
            {gifts.map((gift) => (
              <GiftCard key={gift.id} gift={gift} perspective="sender" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
