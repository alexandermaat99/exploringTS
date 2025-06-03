"use client";

import { useState, useEffect, useMemo, useCallback, memo } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";
import { EnvVarWarning } from "./env-var-warning";
import { createBrowserClient } from "@supabase/ssr";

interface UserProfile {
  display_name: string | null;
  leagues: { name: string } | null;
}

interface User {
  id: string;
  email?: string;
}

// Cache for profile data to avoid repeated API calls
const profileCache = new Map<string, UserProfile>();

const Navigation = memo(() => {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const fetchProfile = useCallback(async (userId: string) => {
    // Check cache first
    if (profileCache.has(userId)) {
      setUserProfile(profileCache.get(userId)!);
      return;
    }

    try {
      const response = await fetch(`/api/profile/${userId}`);
      const result = await response.json();

      if (!response.ok || result.error) {
        console.error("Profile API error:", result.error);
        const fallbackProfile = { display_name: null, leagues: null };
        setUserProfile(fallbackProfile);
        profileCache.set(userId, fallbackProfile);
      } else {
        setUserProfile(result.profile);
        profileCache.set(userId, result.profile);
      }
    } catch (error) {
      console.error("Profile fetch error:", error);
      const fallbackProfile = { display_name: null, leagues: null };
      setUserProfile(fallbackProfile);
      profileCache.set(userId, fallbackProfile);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

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
  }, [supabase, fetchProfile]);

  const toggleMenu = useCallback(() => {
    setIsOpen(!isOpen);
  }, [isOpen]);

  // Memoize nav items to prevent unnecessary recalculations
  const navItems = useMemo(() => {
    const baseItems = [
      { href: "/protected/records", label: "Track Times" },
      { href: "/protected/cars", label: "Cars" },
      { href: "/protected/tracks", label: "Tracks" },
    ];

    if (user) {
      const leagueName = userProfile?.leagues?.name || "League";
      baseItems.push({ href: "/protected/league", label: leagueName });

      const username =
        userProfile?.display_name || user.email?.split("@")[0] || "Profile";

      baseItems.push({ href: "/protected/profile", label: username });
    }

    return baseItems;
  }, [user, userProfile]);

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
});

Navigation.displayName = "Navigation";

export default Navigation;
