"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import ClientHeaderAuth from "./client-header-auth";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { EnvVarWarning } from "./env-var-warning";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  const navItems = [
    // { href: "/", label: "Track Records" },
    { href: "/protected/records", label: "Track Times" },
    { href: "/protected/cars", label: "Cars" },
    { href: "/protected/tracks", label: "Tracks" },
    { href: "/protected/league", label: "League" },
    { href: "/protected/profile", label: "Profile" },
  ];

  return (
    <nav className="bg-white dark:bg-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo - Always visible */}
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              Maat Huis Track Records
            </Link>
          </div>

          {/* Desktop Navigation Items */}
          <div className="hidden md:flex md:space-x-4 md:items-center">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-gray-700 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
              >
                {item.label}
              </Link>
            ))}
          </div>

          {/* Desktop Auth */}
          <div className="hidden md:flex items-center">
            {!hasEnvVars ? <EnvVarWarning /> : <ClientHeaderAuth />}
          </div>

          {/* Mobile menu button - Now on the right */}
          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 dark:text-gray-200 hover:text-blue-500 dark:hover:text-blue-400 focus:outline-none"
            >
              <span className="sr-only">Open main menu</span>
              {isOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={cn(
          "md:hidden transition-all duration-200 ease-in-out",
          isOpen ? "max-h-screen" : "max-h-0 overflow-hidden"
        )}
      >
        {/* Mobile Auth Info */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          {!hasEnvVars ? <EnvVarWarning /> : <ClientHeaderAuth />}
        </div>

        {/* Mobile Navigation Items */}
        <div className="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-slate-800 shadow-lg">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-500 dark:hover:text-blue-400 block px-3 py-2 rounded-md text-base font-medium transition-colors text-right"
              onClick={() => setIsOpen(false)}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
