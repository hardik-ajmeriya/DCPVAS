import { useState } from "react";
import { Moon, Github, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import { APP_URL } from "../config/appConfig";

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const redirectToApp = () => {
    window.location.href = APP_URL;
  };

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <nav className="navbar landing-navbar bg-surface border-b border-border">
      <div className="landing-navbar-row max-w-7xl mx-auto px-6 flex items-center justify-between">

        {/* Logo */}
        <a
          href={APP_URL}
          className="landing-logo-link"
          onClick={closeMenu}
          aria-label="Go to Dashboard"
        >
          <img
            src="/logo.png"
            alt="DCPVAS Logo"
            className="landing-navbar-logo"
          />
        </a>

        {/* Links */}
        <div className="hidden md:flex gap-8 text-sm">
          <a
            href="/#features"
            className="text-muted hover:text-primary transition"
          >
            Features
          </a>
          <a
            href="/#how-it-works"
            className="text-muted hover:text-primary transition"
          >
            How it works
          </a>
          <a
            href="/#proof"
            className="text-muted hover:text-primary transition"
          >
            Proof
          </a>
          <Link
            to="/about"
            className="text-muted hover:text-primary transition"
          >
            About
          </Link>
          <Link
            to="/docs"
            className="text-muted hover:text-primary transition"
          >
            Docs
          </Link>
        </div>

        {/* Actions */}
        <div className="hidden md:flex items-center gap-4">
          <button className="text-muted hover:text-primary transition">
            <Moon size={18} />
          </button>

          <button className="text-muted hover:text-primary transition">
            <Github size={18} />
          </button>

          <button
            className="
            bg-primary text-text 
            px-4 py-2 rounded-lg font-medium
            hover:shadow-[0_0_20px_#7C5CFF]
            transition
          "
            onClick={redirectToApp}
          >
            View Dashboard
          </button>
        </div>

        {/* Mobile actions */}
        <div className="md:hidden flex items-center gap-2">
          <button
            type="button"
            className="rounded-lg border border-border px-2.5 py-2 text-muted hover:text-primary transition"
            aria-label={isMenuOpen ? "Close menu" : "Open menu"}
            onClick={() => setIsMenuOpen((prev) => !prev)}
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>

      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden border-t border-border/70 bg-surface/95 backdrop-blur transition-all duration-300 ease-out ${
          isMenuOpen ? "max-h-[460px] opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 space-y-3 text-sm">
          <a href="/#features" className="block text-muted hover:text-primary transition" onClick={closeMenu}>
            Features
          </a>
          <a href="/#how-it-works" className="block text-muted hover:text-primary transition" onClick={closeMenu}>
            How it works
          </a>
          <a href="/#proof" className="block text-muted hover:text-primary transition" onClick={closeMenu}>
            Proof
          </a>
          <Link to="/about" className="block text-muted hover:text-primary transition" onClick={closeMenu}>
            About
          </Link>
          <Link to="/docs" className="block text-muted hover:text-primary transition" onClick={closeMenu}>
            Docs
          </Link>

          <div className="pt-3 border-t border-border/80 flex items-center gap-4">
            <button type="button" className="text-muted hover:text-primary transition" aria-label="Toggle theme">
              <Moon size={18} />
            </button>
            <button type="button" className="text-muted hover:text-primary transition" aria-label="GitHub">
              <Github size={18} />
            </button>
          </div>

          <button
            type="button"
            className="w-full mt-1 bg-primary text-text px-4 py-2 rounded-lg font-medium hover:shadow-[0_0_20px_#7C5CFF] transition"
            onClick={redirectToApp}
          >
            View Dashboard
          </button>
        </div>
      </div>
    </nav>
  );
}
