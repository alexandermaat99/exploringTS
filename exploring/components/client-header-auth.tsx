"use client";

import { createBrowserClient } from "@supabase/ssr";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { hasEnvVars } from "@/utils/supabase/check-env-vars";

export default function ClientHeaderAuth() {
  const [user, setUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    let mounted = true;

    const getUser = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (mounted) {
          setUser(user);
          setLoading(false);
        }

        // Try to get profile but don't let it block showing the user
        if (user && mounted) {
          try {
            const { data: profile } = await supabase
              .from("user_profiles")
              .select("*, leagues!league_id(*)")
              .eq("id", user.id)
              .single();

            if (mounted) {
              setUserProfile(profile);
            }
          } catch (error) {
            console.error("Error fetching profile:", error);
          }
        }
      } catch (error) {
        console.error("Error fetching user:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      const currentUser = session?.user;
      setUser(currentUser ?? null);
      setLoading(false);

      if (currentUser) {
        // Try to get profile but don't block the UI
        try {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("*, leagues!league_id(*)")
            .eq("id", currentUser.id)
            .single();

          if (mounted) {
            setUserProfile(profile);
          }
        } catch (error) {
          console.error("Error fetching profile:", error);
        }
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  if (!hasEnvVars) {
    return (
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <Badge
          variant={"default"}
          className="font-normal pointer-events-none text-center md:text-left"
        >
          Please update .env.local file with anon key and url
        </Badge>
        <div className="flex gap-2">
          <Button
            asChild
            size="sm"
            variant={"outline"}
            disabled
            className="opacity-75 cursor-none pointer-events-none"
          >
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button
            asChild
            size="sm"
            variant={"default"}
            disabled
            className="opacity-75 cursor-none pointer-events-none"
          >
            <Link href="/sign-up">Sign up</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="h-8 w-32 animate-pulse bg-gray-200 dark:bg-gray-600 rounded" />
    );
  }

  return user ? (
    <div className="flex items-center gap-4">
      <div className="text-sm md:text-base font-medium">
        {userProfile?.display_name || user.email?.split("@")[0] || "User"}
      </div>
    </div>
  ) : (
    <div className="flex gap-2">
      <Button asChild size="sm" variant={"outline"}>
        <Link href="/sign-in">Sign in</Link>
      </Button>
      <Button asChild size="sm" variant={"default"}>
        <Link href="/sign-up">Sign up</Link>
      </Button>
    </div>
  );
}
