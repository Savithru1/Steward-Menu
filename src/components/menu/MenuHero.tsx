"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Clock3, MapPin, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRestaurant } from "@/components/providers/RestaurantContext";

export function MenuHero({ className }: { className?: string }) {
  const { theme, slug } = useRestaurant();

  const initials = theme.restaurantName
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <section className={cn("px-4 sm:px-6 lg:px-8 pt-14 sm:pt-16 pb-10", className)}>
      <div className="mx-auto max-w-5xl relative">
        {/* My Orders pill — top-right of hero */}
        <div className="absolute top-0 right-0 z-10">
          <Link href={`/menu/${slug}/my-orders`}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-[11px] font-medium text-foreground/60 hover:bg-accent transition-colors cursor-pointer">
              <ClipboardList className="h-3 w-3" />
              My Orders
            </span>
          </Link>
        </div>

        {theme.bannerUrl && (
          <div className="relative w-full h-40 sm:h-56 mb-8 rounded-2xl overflow-hidden border border-border">
            <Image
              src={theme.bannerUrl}
              alt={`${theme.restaurantName} banner`}
              fill
              className="object-cover opacity-70"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/40" />
          </div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          className="grid gap-6"
        >
          <div className="grid gap-4">
            <div className="inline-flex items-center gap-4">
              {/* Logo */}
              <div className="h-12 w-12 rounded-xl border border-border bg-card grid place-items-center overflow-hidden flex-shrink-0">
                {theme.logoUrl ? (
                  <Image
                    src={theme.logoUrl}
                    alt={`${theme.restaurantName} logo`}
                    width={48}
                    height={48}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  <span className="text-[13px] font-semibold tracking-[0.14em] text-foreground/80">
                    {initials}
                  </span>
                )}
              </div>

              <div className="leading-tight">
                <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground">
                  {theme.restaurantName}
                </h1>
                {theme.tagline && (
                  <p className="text-sm text-foreground/45 mt-1 font-normal">
                    {theme.tagline}
                  </p>
                )}
              </div>
            </div>

            {(theme.hours || theme.serviceTypes) && (
              <div className="flex flex-wrap gap-2">
                {theme.hours && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5">
                    <Clock3 className="h-3.5 w-3.5 text-foreground/40" />
                    <span className="text-xs font-medium text-foreground/55">{theme.hours}</span>
                  </div>
                )}
                {theme.serviceTypes && (
                  <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-1.5">
                    <MapPin className="h-3.5 w-3.5 text-foreground/40" />
                    <span className="text-xs font-medium text-foreground/55">{theme.serviceTypes}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
