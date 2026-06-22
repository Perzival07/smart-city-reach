import { Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/portal/Button";
import { classNames } from "@/utils/helpers";

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const path = router.state.location.pathname;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isLanding = path === "/";

  return (
    <header
      className={classNames(
        "sticky top-0 z-40 transition-all",
        scrolled || !isLanding
          ? "bg-sand-50/95 backdrop-blur border-b-2 border-ink-950"
          : "bg-transparent border-b-2 border-transparent"
      )}
    >
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-9 h-9 rounded-md bg-forest-500 border-2 border-ink-950 grid place-items-center brutal-shadow-sm">
            <span className="font-display font-bold text-ink-950 text-lg">C</span>
          </div>
          <span className="font-display font-bold text-xl text-ink-950">CleanCity</span>
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <a href="#how" className="font-medium text-ink-950 hover:underline underline-offset-4">How it works</a>
          <a href="#features" className="font-medium text-ink-950 hover:underline underline-offset-4">Features</a>
          <Link to="/login" className="font-medium text-ink-950 hover:underline underline-offset-4">Sign in</Link>
          <Link to="/signup">
            <Button variant="brutal" size="sm">Get started</Button>
          </Link>
        </nav>

        <button
          className="md:hidden p-2 border-2 border-ink-950 rounded-md bg-sand-50"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {open ? (
        <div className="md:hidden border-t-2 border-ink-950 bg-sand-50 px-4 py-4 flex flex-col gap-3">
          <a href="#how" onClick={() => setOpen(false)} className="font-medium">How it works</a>
          <a href="#features" onClick={() => setOpen(false)} className="font-medium">Features</a>
          <Link to="/login" className="font-medium">Sign in</Link>
          <Link to="/signup"><Button variant="brutal" size="sm" className="w-full">Get started</Button></Link>
        </div>
      ) : null}
    </header>
  );
}
