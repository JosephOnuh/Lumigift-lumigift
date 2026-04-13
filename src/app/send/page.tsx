import type { Metadata } from "next";
import { CreateGiftForm } from "@/components/gift/CreateGiftForm";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Send a Gift" };

export default function SendPage() {
  return (
    <div className={styles.page}>
      <div className={`container container--sm ${styles.inner}`}>
        <CreateGiftForm />
      </div>
    </div>
  );
}
