import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";

interface Props {
  title: string;
  subtitle?: string;
  message?: string;
  children: ReactNode;
}

export function AuthLayout({ title, subtitle, message, children }: Props) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-sand-50">
      {/* Left panel — neo-brutalist */}
      <div className="relative hidden lg:flex flex-col justify-between p-12 bg-forest-500 border-r-4 border-ink-950 overflow-hidden">
        <div className="absolute inset-0 bg-noise pointer-events-none opacity-50" />
        <Link to="/" className="relative flex items-center gap-3 z-10">
          <div className="w-12 h-12 rounded-md bg-sand-50 border-2 border-ink-950 grid place-items-center brutal-shadow-sm">
            <span className="font-display font-bold text-ink-950 text-2xl">C</span>
          </div>
          <span className="font-display font-bold text-2xl text-ink-950">CleanCity</span>
        </Link>

        <div className="relative z-10 space-y-6">
          <div className="inline-block bg-sand-50 border-2 border-ink-950 px-3 py-1 brutal-shadow-sm">
            <span className="font-mono text-xs uppercase tracking-wider text-ink-950">
              {subtitle || "Civic platform"}
            </span>
          </div>
          <h2 className="font-display font-bold text-5xl text-ink-950 leading-[0.95]">
            {message || "Cleaner streets.\nFaster response.\nReal accountability."}
          </h2>
          <p className="text-ink-950/80 max-w-md font-medium">
            Citizens report. Collectors respond. Admins coordinate. One platform, one
            cleaner city.
          </p>
        </div>

        <div className="relative z-10 flex gap-3">
          <div className="w-16 h-2 bg-ink-950" />
          <div className="w-8 h-2 bg-ink-950/40" />
          <div className="w-4 h-2 bg-ink-950/20" />
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-md">
          <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-md bg-forest-500 border-2 border-ink-950 grid place-items-center brutal-shadow-sm">
              <span className="font-display font-bold text-ink-950">C</span>
            </div>
            <span className="font-display font-bold text-xl text-ink-950">CleanCity</span>
          </Link>
          <h1 className="font-display font-bold text-3xl md:text-4xl text-ink-950">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-ink-950/70">{subtitle}</p>
          ) : null}
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
