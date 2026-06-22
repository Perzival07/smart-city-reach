import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="bg-ink-950 text-sand-100 border-t-2 border-ink-950">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-12 grid md:grid-cols-4 gap-8">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-md bg-forest-500 border-2 border-sand-50 grid place-items-center">
              <span className="font-display font-bold text-ink-950 text-lg">C</span>
            </div>
            <span className="font-display font-bold text-xl">CleanCity</span>
          </div>
          <p className="mt-4 max-w-md text-sand-300 text-sm">
            A role-based urban waste management platform connecting citizens, collectors, and city administrators.
          </p>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3">Product</h4>
          <ul className="space-y-2 text-sm text-sand-300">
            <li><a href="#features" className="hover:text-sand-50">Features</a></li>
            <li><a href="#how" className="hover:text-sand-50">How it works</a></li>
            <li><Link to="/signup" className="hover:text-sand-50">Get started</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="font-display font-semibold mb-3">Account</h4>
          <ul className="space-y-2 text-sm text-sand-300">
            <li><Link to="/login" className="hover:text-sand-50">Sign in</Link></li>
            <li><Link to="/signup" className="hover:text-sand-50">Sign up</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-sand-900/40 py-4 text-center text-xs text-sand-400">
        © {new Date().getFullYear()} CleanCity. Built for cleaner cities.
      </div>
    </footer>
  );
}
