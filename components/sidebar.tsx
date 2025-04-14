"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Wind, MapPin, Route, Building2, Menu, Sun, Moon } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

const navigation = [
  {
    name: "Monitoring",
    href: "/monitoring",
    icon: Wind,
  },
  {
    name: "Prediction",
    href: "/prediction",
    icon: MapPin,
  },
  {
    name: "Route Optimizer",
    href: "/route-optimizer",
    icon: Route,
  },
  {
    name: "Urban Planning",
    href: "/urban-planning",
    icon: Building2,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const ThemeToggle = () => (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="ml-auto"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild className="lg:hidden fixed left-4 top-4 z-50">
          <Button variant="outline" size="icon">
            <Menu className="h-6 w-6" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <nav className="flex flex-col h-full bg-card p-6">
            <div className="px-3 py-2 flex items-center justify-between">
              <div>
                <h2 className="mb-2 text-lg font-semibold">UAQMP</h2>
                <p className="text-sm text-muted-foreground">
                  Monitor, predict, and plan for better air quality
                </p>
              </div>
              <ThemeToggle />
            </div>
            <div className="space-y-1 mt-8">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                    pathname === item.href
                      ? "bg-accent text-accent-foreground"
                      : "text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </div>
          </nav>
        </SheetContent>
      </Sheet>

      <div className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-72">
        <nav className="flex flex-col flex-grow w-72 bg-card border-r">
          <div className="px-6 py-8 flex items-center justify-between">
            <div>
              <h2 className="mb-2 text-lg font-semibold">Air Quality Hub</h2>
              <p className="text-sm text-muted-foreground">
                Monitor, predict, and plan for better air quality
              </p>
            </div>
            <ThemeToggle />
          </div>
          <div className="space-y-1 px-3 mt-4">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-x-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors",
                  pathname === item.href
                    ? "bg-accent text-accent-foreground"
                    : "text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </>
  );
}
