"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Search } from "lucide-react";
import { useParams } from "next/navigation";

import { MenuHero } from "@/components/menu/MenuHero";
import { SearchBar } from "@/components/menu/SearchBar";
import { CategoryTabs } from "@/components/menu/CategoryTabs";
import { FeaturedSection } from "@/components/menu/FeaturedSection";
import { MenuCard } from "@/components/menu/MenuCard";
import { ItemModal } from "@/components/menu/ItemModal";
import { FloatingCartButton } from "@/components/cart/FloatingCartButton";
import { EmptyState } from "@/components/ds/EmptyState";
import { MenuGridSkeleton } from "@/components/menu/MenuGridSkeleton";
import { useMenu } from "@/hooks/useMenu";
import { useRestaurant } from "@/components/providers/RestaurantContext";
import type { ApiMenuItem } from "@/types";
import { telemetry } from "@/lib/telemetry";

export default function MenuPage() {
  const { slug } = useParams<{ slug: string }>();
  const { theme, offlineMode } = useRestaurant();

  const [activeCategory, setActiveCategory] = useState("all");
  const [selectedItem, setSelectedItem] = useState<ApiMenuItem | null>(null);
  const [search, setSearch] = useState("");

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (menuData?.restaurant?.id) {
      telemetry.track(menuData.restaurant.id, "page_view", { page: "menu", slug });
    }
  }, [menuData?.restaurant?.id, slug]);

  const handleSelectItem = (item: ApiMenuItem) => {
    setSelectedItem(item);
    if (menuData?.restaurant?.id) {
      telemetry.track(menuData.restaurant.id, "item_view", { itemId: item.id, itemName: item.name });
    }
  };

  const handleSearch = (q: string) => {
    setSearch(q);
  };

  const { data: menuData, isLoading, isError } = useMenu(slug);

  const featuredItems = useMemo(
    () =>
      (menuData?.items || []).filter(
        (item) => item.isPopular && item.isAvailable
      ),
    [menuData?.items]
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (menuData?.items || []).filter((item) => {
      const matchCategory =
        activeCategory === "all" || item.categoryId === activeCategory;
      const matchSearch =
        q === "" ||
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q);
      return matchCategory && matchSearch;
    });
  }, [activeCategory, menuData?.items, search]);

  const activeCategoryName =
    menuData?.categories?.find((c) => c.id === activeCategory)?.name ?? "Menu";

  if (!mounted) {
    return (
      <main className="min-h-screen pb-32">
        <MenuHero />
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-6">
          <SearchBar
            value=""
            onChange={() => {}}
            placeholder="Search dishes, filter by cravings"
          />
        </div>
        <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
          <MenuGridSkeleton count={6} />
        </section>
      </main>
    );
  }

  if (offlineMode) {
    return (
      <main className="min-h-screen pb-32">
        <MenuHero />
        <section className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="rounded-3xl border border-border bg-card p-8 sm:p-10 shadow-[0_18px_50px_rgba(var(--surface-raised-rgb),0.10)] space-y-4">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              {theme.restaurantName}
            </h2>
            <p className="text-sm text-foreground/45 leading-relaxed">
              We&apos;re currently closed. Online ordering is not available right now.
            </p>
          </div>
        </section>
        <footer className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-12 text-center">
          <p className="text-[11px] text-foreground/30">
            {theme.footerNote ??
              "All prices include applicable taxes. Made fresh to order."}
          </p>
        </footer>
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-32">
      <MenuHero />

      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-6">
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Search dishes, filter by cravings"
        />
      </div>

      {!isLoading && !isError && (
        <CategoryTabs
          categories={menuData?.categories || []}
          activeId={activeCategory}
          onChange={setActiveCategory}
        />
      )}

      {!isLoading &&
        !isError &&
        activeCategory === "all" &&
        search.trim() === "" &&
        featuredItems.length > 0 && (
          <FeaturedSection
            items={featuredItems}
            onItemClick={handleSelectItem}
          />
        )}

      <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-end gap-4 mb-7">
          <div className="min-w-0">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground truncate">
              {search.trim() ? "Search" : activeCategoryName}
            </h2>
            <p className="text-sm text-foreground/30 mt-1">
              {isLoading
                ? "Loading menu..."
                : `${filteredItems.length} item${filteredItems.length === 1 ? "" : "s"}`}
            </p>
          </div>
          <div className="h-px flex-1 bg-border" />
        </div>

        {isLoading ? (
          <MenuGridSkeleton count={6} />
        ) : isError ? (
          <EmptyState
            icon={Search}
            title="Menu unavailable"
            description="We couldn't load the menu right now. Please try again in a moment."
            actionLabel="Retry"
            onAction={() => window.location.reload()}
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description="Try a different search, or switch categories."
            actionLabel="Clear"
            onAction={() => {
              setSearch("");
              setActiveCategory("all");
            }}
          />
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              initial="hidden"
              animate="show"
              exit="hidden"
              variants={{
                hidden: { opacity: 0 },
                show: {
                  opacity: 1,
                  transition: { staggerChildren: 0.02 },
                },
              }}
              className={`grid gap-5 sm:gap-6 ${
                theme.menuLayout === "list"
                  ? "grid-cols-1 max-w-2xl mx-auto w-full"
                  : "grid-cols-1 md:grid-cols-2"
              }`}
            >
              {filteredItems.map((item) => (
                <motion.div
                  key={item.id}
                  variants={{
                    hidden: { opacity: 0, y: 8 },
                    show: {
                      opacity: 1,
                      y: 0,
                  transition: { duration: 0.24, ease: [0.16, 1, 0.3, 1] },
                    },
                  }}
                >
                  <MenuCard item={item} onOpen={handleSelectItem} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>
        )}
      </section>

      <footer className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-12 text-center">
        <p className="text-[11px] text-foreground/30">
          {theme.footerNote ??
            "All prices include applicable taxes. Made fresh to order."}
        </p>
      </footer>

      <ItemModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
      />
      <FloatingCartButton />
    </main>
  );
}
