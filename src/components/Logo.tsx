import { Bookmark } from "lucide-react";
import { Link } from "react-router-dom";

export const Logo = ({ to = "/" }: { to?: string }) => (
  <Link to={to} className="flex items-center gap-2 group">
    <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center shadow-pink group-hover:scale-105 transition-transform">
      <Bookmark className="w-5 h-5 text-primary-foreground" fill="currentColor" />
    </div>
    <span className="font-display text-2xl font-semibold text-secondary tracking-tight">
      AstralStash
    </span>
  </Link>
);
