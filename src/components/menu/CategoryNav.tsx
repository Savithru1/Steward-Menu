"use client";

import { cn } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface CategoryNavProps {
  categories: { id: string; name: string }[];
  activeCategory: string;
  onSelectCategory: (id: string) => void;
}

export function CategoryNav({ categories, activeCategory, onSelectCategory }: CategoryNavProps) {
  const [scrolled, setScrolled] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 220);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const checkScroll = () => {
      if (scrollRef.current) {
        setCanScrollLeft(scrollRef.current.scrollLeft > 0);
        setCanScrollRight(
          scrollRef.current.scrollLeft < scrollRef.current.scrollWidth - scrollRef.current.clientWidth - 10
        );
      }
    };
    checkScroll();
    const ref = scrollRef.current;
    ref?.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      ref?.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 200;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <div
      className={cn(
        "sticky top-0 z-40 w-full transition-all duration-350",
        scrolled
          ? "bg-background/90 backdrop-blur-xl border-b border-border shadow-xl py-3"
          : "bg-background/45 backdrop-blur-md border-b border-border/50 py-4.5"
      )}
    >
      <div className="relative px-4 sm:px-6 lg:px-8">
        {/* Left scroll indicator button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll("left")}
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-r-lg bg-gradient-to-r from-background to-transparent hover:from-background/90 transition-colors touch-target"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5 text-foreground/40 hover:text-foreground transition-colors" />
          </button>
        )}

        {/* Categories scroll container */}
        <div
          ref={scrollRef}
          className="flex items-center gap-2.5 overflow-x-auto no-scrollbar scroll-smooth"
          style={{ scrollBehavior: "smooth" }}
        >
          {categories.map((category) => {
            const isActive = activeCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => onSelectCategory(category.id)}
                className={cn(
                  "whitespace-nowrap rounded-full px-6 py-3 text-xs font-bold uppercase tracking-widest transition-all duration-300 border flex-shrink-0 touch-target active:scale-95",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_20px_rgba(var(--color-primary)/0.2)]"
                    : "bg-secondary text-foreground/40 border-border/50 hover:border-border hover:text-foreground hover:bg-accent"
                )}
              >
                {category.name}
              </button>
            );
          })}
        </div>

        {/* Right scroll indicator button */}
        {canScrollRight && (
          <button
            onClick={() => scroll("right")}
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-l-lg bg-gradient-to-l from-background to-transparent hover:from-background/90 transition-colors touch-target"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5 text-foreground/40 hover:text-foreground transition-colors" />
          </button>
        )}
      </div>
    </div>
  );
}
