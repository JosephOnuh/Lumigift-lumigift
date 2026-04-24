"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { GiftCard } from "@/components/gift/GiftCard";
import styles from "./page.module.css";
import type { ApiResponse } from "@/types";
import type { GiftPage } from "@/server/services/gift.service";

async function fetchGifts({ pageParam }: { pageParam: string | null }): Promise<GiftPage> {
  const url = pageParam
    ? `/api/v1/gifts?cursor=${pageParam}`
    : "/api/v1/gifts";
  const res = await fetch(url);
  const json: ApiResponse<GiftPage> = await res.json();
  if (!json.success) throw new Error(json.error);
  return json.data;
}

export default function DashboardPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery({
    queryKey: ["gifts"],
    queryFn: fetchGifts,
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor,
  });

  const allGifts = data?.pages.flatMap((p) => p.gifts) ?? [];
  const total = data?.pages[0]?.total ?? 0;

  if (status === "pending") {
    return (
      <div className={styles.page}>
        <div className="container">
          <p>Loading gifts…</p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className={styles.page}>
        <div className="container">
          <p>Failed to load gifts. Please try again.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className="container">
        <h1 className={styles.title}>Your Gifts</h1>

        {allGifts.length === 0 ? (
          <div className={styles.empty}>
            <p>You haven&apos;t sent any gifts yet.</p>
            <a href="/send" className="btn btn--primary">
              Send your first gift
            </a>
          </div>
        ) : (
          <>
            <p className={styles.count}>
              Showing {allGifts.length} of {total} gifts
            </p>
            <div className={styles.grid}>
              {allGifts.map((gift) => (
                <GiftCard key={gift.id} gift={gift} perspective="sender" />
              ))}
            </div>
            {hasNextPage && (
              <div className={styles.loadMore}>
                <button
                  className="btn btn--secondary"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  aria-busy={isFetchingNextPage}
                >
                  {isFetchingNextPage ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
