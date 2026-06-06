"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

export function CategoryTabs(props: {
  categories: { id: string; name: string }[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
}) {
  const [scrolled, setScrolled] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const tabs = useMemo(() => {
    const unique = new Map<string, string>();
    for (const c of props.categories) unique.set(c.id, c.name);
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
  }, [props.categories]);

  return (
    <div
      className={cn(
        "sticky top-0 z-40 w-full border-b transition-colors",
        scrolled
          ? "border-border bg-background/90 backdrop-blur-xl"
          : "border-border/60 bg-background/70 backdrop-blur-md",
        props.className
      )}
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-3">
        <div
          ref={scrollerRef}
          className="no-scrollbar flex items-center gap-2 overflow-x-auto"
        >
          {tabs.map((t) => {
            const isActive = t.id === props.activeId;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => props.onChange(t.id)}
                className={cn(
                  "relative flex-shrink-0 whitespace-nowrap rounded-full px-4 py-1.5 text-xs font-medium tracking-tight border transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-ring bg-primary text-primary-foreground"
                    : "border-border bg-card text-foreground/50 hover:bg-accent hover:text-foreground/75"
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="activeTab"
                    className="absolute inset-0 rounded-full"
                    transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
                  />
                )}
                <span className="relative">{t.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
