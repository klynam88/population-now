"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-[11px] tracking-[0.16em] text-[#e7c98a] uppercase">Error</p>
      <h1 className="mt-3 text-2xl">The page did not finish rendering.</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        No population figure was invented to fill the gap.
      </p>
      <Button type="button" className="mt-6 font-mono" onClick={() => reset()}>
        Try again
      </Button>
    </div>
  );
}
