import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

export const ThemeToggle = ({ className = "" }: { className?: string }) => {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className={`relative inline-flex items-center h-9 w-9 rounded-full bg-muted hover:bg-accent transition-colors ${className}`}
    >
      <span className="absolute inset-0 flex items-center justify-center">
        {theme === "dark" ? (
          <Sun className="w-4 h-4 text-primary" />
        ) : (
          <Moon className="w-4 h-4 text-secondary" />
        )}
      </span>
    </button>
  );
};
