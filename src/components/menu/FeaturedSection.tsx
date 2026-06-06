"use client";

import { ApiMenuItem } from "@/hooks/useMenu";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { MenuCard } from "./MenuCard";

export function FeaturedSection(props: {
  items: ApiMenuItem[];
  onItemClick: (item: ApiMenuItem) => void;
}) {
  if (!props.items || props.items.length === 0) return null;

  return (
    <section className="border-b border-border py-8">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 mb-5 flex items-center gap-4">
        <div className="h-px flex-1 bg-border" />
        <h2 className="text-[10px] font-medium tracking-[0.20em] uppercase text-foreground/30">
          Popular Choices
        </h2>
        <div className="h-px flex-1 bg-border" />
      </div>

      <ScrollArea className="w-full whitespace-nowrap">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 pb-3 flex w-max gap-4">
          {props.items.map((item) => (
            <div key={item.id} className="w-[320px] sm:w-[380px]">
              <MenuCard item={item} onOpen={props.onItemClick} />
            </div>
          ))}
        </div>
        <ScrollBar orientation="horizontal" className="hidden" />
      </ScrollArea>
    </section>
  );
}
