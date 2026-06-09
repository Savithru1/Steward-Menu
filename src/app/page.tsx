"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

export default function RootPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function resolveContext() {
      try {
        // 1. Check steward:restaurantSlug
        const storedSlug = localStorage.getItem("steward:restaurantSlug");
        if (storedSlug) {
          router.replace(`/menu/${storedSlug}`);
          return;
        }

        // 2. Check steward:restaurantId
        const storedId = localStorage.getItem("steward:restaurantId");
        if (storedId) {
          try {
            const res = await api.get<{ data: { restaurantSlug?: string } }>(
              `/menu/${storedId}/theme`
            );
            const slug = res.data.data?.restaurantSlug;
            if (slug) {
              router.replace(`/menu/${slug}`);
              return;
            }
          } catch (err) {
            console.error("Failed to fetch slug by restaurant ID", err);
          }
        }

        // 3. Scan localStorage for order tokens containing the slug
        let foundSlugFromToken: string | null = null;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith("steward_order_token_")) {
            foundSlugFromToken = key.replace("steward_order_token_", "");
            break;
          }
        }
        if (foundSlugFromToken) {
          router.replace(`/menu/${foundSlugFromToken}`);
          return;
        }

        // No fallback slug redirect - show the landing page so users scan QR code or go to direct URL
      } catch (e) {
        console.error("Context resolution error:", e);
      } finally {
        setLoading(false);
      }
    }

    resolveContext();
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center bg-black">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#D9B872] border-t-transparent" />
          <p className="text-xs text-white/40 tracking-wider">RESOLVING CONTEXT...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen grid place-items-center px-4 bg-black text-white">
      <div className="text-center space-y-4 max-w-sm">
        <h1 className="text-2xl font-bold tracking-tight text-[#D9B872]">Steward</h1>
        <p className="text-sm text-white/60 leading-relaxed">
          Scan the QR code at your table to open the menu, or visit{" "}
          <code className="font-mono text-xs bg-white/10 px-1.5 py-0.5 rounded text-[#D9B872]">
            /menu/&lt;restaurant-slug&gt;
          </code>{" "}
          directly.
        </p>
      </div>
    </main>
  );
}
