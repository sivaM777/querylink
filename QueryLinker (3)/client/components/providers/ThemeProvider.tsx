import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light" | "system";

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

type ThemeProviderState = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  actualTheme: "dark" | "light";
};

const initialState: ThemeProviderState = {
  theme: "light", // Force light as default
  setTheme: () => null,
  actualTheme: "light",
};

const ThemeProviderContext = createContext<ThemeProviderState>(initialState);

export function ThemeProvider({
  children,
  defaultTheme = "light", // Changed default to light
  storageKey = "querylinker-theme",
  ...props
}: ThemeProviderProps) {
  // Initialize with light theme
  const [theme, setTheme] = useState<Theme>("light");
  const [actualTheme, setActualTheme] = useState<"dark" | "light">("light");

  // Apply theme function
  const applyTheme = (themeToApply: Theme) => {
    const root = document.documentElement;
    
    // Remove existing theme classes
    root.classList.remove("light", "dark");
    
    let resolvedTheme: "dark" | "light" = "light";
    
    if (themeToApply === "system") {
      resolvedTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
    } else {
      resolvedTheme = themeToApply;
    }
    
    // Apply the resolved theme
    root.classList.add(resolvedTheme);
    setActualTheme(resolvedTheme);
    
    // Store preferences
    localStorage.setItem(storageKey, themeToApply);
    localStorage.setItem("darkMode", (resolvedTheme === "dark").toString());
    
    console.log(`Theme applied: ${themeToApply} (resolved: ${resolvedTheme})`);
  };

  // Initialize theme on mount
  useEffect(() => {
    // Get saved theme or use default light theme
    const savedTheme = localStorage.getItem(storageKey) as Theme;
    const initialTheme = savedTheme || defaultTheme;

    console.log("ThemeProvider initializing with theme:", initialTheme);

    setTheme(initialTheme);
    applyTheme(initialTheme);

    console.log("ThemeProvider initialized");
  }, [storageKey]);

  // Handle theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for system theme changes when theme is "system"
  useEffect(() => {
    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      
      const handleChange = () => {
        applyTheme("system");
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      setTheme(newTheme);
    },
    actualTheme,
  };

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext);

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider");

  return context;
};
