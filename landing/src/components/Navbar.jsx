import { Moon, Github } from "lucide-react";
import { Link } from "react-router-dom";
import { APP_URL } from "../config/appConfig";

export default function Navbar() {
  const redirectToApp = () => {
    window.location.href = APP_URL;
  };

  return (
    <nav className="sticky top-0 z-50 bg-surface border-b border-border">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <span className="text-primary font-bold text-xl">DCPVAS</span>
          <span className="text-muted text-sm">AI CI/CD Analyzer</span>
        </Link>

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
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4">
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

      </div>
    </nav>
  );
}
