import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">404</p>
      <h1 className="mt-3 text-2xl">That page is not in this release.</h1>
      <Link href="/" className="mt-6 inline-block text-sm text-primary">
        Return to the query
      </Link>
    </div>
  );
}
