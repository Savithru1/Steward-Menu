"use client";

import { motion } from "framer-motion";

export function MenuGridSkeleton(props: { count?: number }) {
  const count = props.count ?? 6;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: i * 0.03, duration: 0.35 }}
          className="rounded-3xl border border-[rgba(27,18,13,0.08)] bg-[rgba(255,255,255,0.22)] backdrop-blur-xl p-5 sm:p-6 shadow-[0_18px_50px_rgba(27,18,13,0.10)]"
        >
          <div className="flex gap-5">
            <div className="flex-1 space-y-3">
              <div className="h-4 w-20 rounded-md bg-[rgba(27,18,13,0.08)]" />
              <div className="h-5 w-3/4 rounded bg-[rgba(27,18,13,0.10)]" />
              <div className="space-y-2">
                <div className="h-3 w-full rounded bg-[rgba(27,18,13,0.06)]" />
                <div className="h-3 w-4/5 rounded bg-[rgba(27,18,13,0.06)]" />
              </div>
              <div className="flex items-center justify-between pt-3">
                <div className="h-5 w-16 rounded bg-[rgba(27,18,13,0.10)]" />
                <div className="h-9 w-24 rounded-full bg-[rgba(27,18,13,0.06)]" />
              </div>
            </div>
            <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl bg-[rgba(27,18,13,0.06)]" />
          </div>
        </motion.div>
      ))}
    </div>
  );
}

