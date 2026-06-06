"use client";

import { cn } from "@/lib/utils";
import { Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { useId, useState } from "react";

export function SearchBar(props: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [focused, setFocused] = useState(false);
  const id = useId();

  return (
    <motion.div
      layout
      className={cn("relative w-full", props.className)}
      animate={{ scale: focused ? 1.005 : 1 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
    >
      <label htmlFor={id} className="sr-only">Search menu</label>

      <div
        className={cn(
          "flex items-center gap-3 rounded-full border px-4 py-3 transition-colors",
          focused
            ? "border-border/[2.5] bg-accent"
            : "border-border bg-card"
        )}
      >
        <Search className="h-4 w-4 text-foreground/35 shrink-0" />
        <input
          id={id}
          type="text"
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={props.placeholder ?? "Search dishes"}
          className="w-full bg-transparent text-sm text-foreground placeholder:text-foreground/30 focus:outline-none"
        />
        {props.value.trim().length > 0 && (
          <button
            type="button"
            onClick={() => props.onChange("")}
            className="grid h-7 w-7 place-items-center rounded-full border border-border bg-card text-foreground/50 hover:text-foreground hover:bg-accent transition-colors focus-visible:outline-none"
          >
            <X className="h-3.5 w-3.5" />
            <span className="sr-only">Clear search</span>
          </button>
        )}
      </div>
    </motion.div>
  );
}
