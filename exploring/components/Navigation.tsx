"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { EnvVarWarning } from "./env-var-warning";
import { createBrowserClient } from "@supabase/ssr";

export default function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    let mounted = true;

    const fetchProfile = async (userId: string) => {
      try {
        console.log(`Navigation - Fetching profile for user:`, userId);

        // Use API route instead of direct database query
        const response = await fetch(`/api/profile/${userId}`);
        const result = await response.json();

        console.log("Navigation - Profile result:", result);

        if (!response.ok || result.error) {
          console.error("Profile API error:", result.error);
          if (mounted) {
            setUserProfile({ display_name: null });
          }
        } else {
          if (mounted) {
            setUserProfile(result.profile);
          }
        }
      } catch (error) {
        console.error("Profile fetch error:", error);
        if (mounted) {
          setUserProfile({ display_name: null });
        }
      }
    };

    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (mounted) {
          setUser(user);
        }

        if (user && mounted) {
          await fetchProfile(user.id);
        }
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const currentUser = session?.user;
      setUser(currentUser ?? null);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Create nav items with dynamic username for profile
  const getNavItems = () => {
    const baseItems = [
      { href: "/protected/records", label: "Track Times" },
      { href: "/protected/cars", label: "Cars" },
      { href: "/protected/tracks", label: "Tracks" },
    ];

    // Add league with dynamic name
    if (user) {
      const leagueName = userProfile?.leagues?.name || "League";
      baseItems.push({ href: "/protected/league", label: leagueName });

      // Debug logging
      console.log("Navigation - user:", user?.email);
      console.log("Navigation - userProfile:", userProfile);
      console.log("Navigation - display_name:", userProfile?.display_name);
      console.log("Navigation - leagues:", userProfile?.leagues);
      console.log("Navigation - league_name:", userProfile?.leagues?.name);

      const username =
        userProfile?.display_name || user.email?.split("@")[0] || "Profile";
      console.log("Navigation - final username:", username);

      baseItems.push({ href: "/protected/profile", label: username });
    }

    return baseItems;
  };

  const navItems = getNavItems();

  return (
    <nav className="bg-white dark:bg-slate-800 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          {/* Logo - Left side */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold">
              Maat Huis Track Records
            </Link>
          </div>

          {/* Desktop Navigation Items - Centered */}
          <div className="hidden md:flex md:flex-1 md:justify-center">
            <div className="flex space-x-8">
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
          </div>

          {/* Desktop Auth - Right side */}
          <div className="hidden md:flex md:flex-shrink-0 md:ml-6">
            {!hasEnvVars ? (
              <EnvVarWarning />
            ) : !user ? (
              <div className="flex gap-2">
                <Button asChild size="sm" variant={"outline"}>
                  <Link href="/sign-in">Sign in</Link>
                </Button>
                <Button asChild size="sm" variant={"default"}>
                  <Link href="/sign-up">Sign up</Link>
                </Button>
              </div>
            ) : null}
          </div>

          {/* Mobile menu button - Right side */}
          <div className="md:hidden ml-auto">
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
        {!hasEnvVars ? (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <EnvVarWarning />
          </div>
        ) : !user ? (
          <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex gap-2">
              <Button asChild size="sm" variant={"outline"}>
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm" variant={"default"}>
                <Link href="/sign-up">Sign up</Link>
              </Button>
            </div>
          </div>
        ) : null}

        {/* Mobile Navigation Items */}
        <div className="px-2 pt-2 pb-3 space-y-1 bg-white dark:bg-slate-800 shadow-lg">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 hover:text-blue-500 dark:hover:text-blue-400 block px-3 py-2 rounded-md text-base font-medium transition-colors"
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
