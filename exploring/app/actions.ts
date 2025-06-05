"use server";

import { encodedRedirect } from "@/utils/utils";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const signUpAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const password = formData.get("password")?.toString();
  const displayName = formData.get("display_name")?.toString();
  const leagueOption = formData.get("league_option")?.toString();
  const leagueCode = formData.get("league_code")?.toString();
  const leagueName = formData.get("league_name")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");

  if (!email || !password || !displayName || !leagueOption) {
    return encodedRedirect("error", "/sign-up", "All fields are required");
  }

  // Validate league-specific fields
  if (leagueOption === "join" && !leagueCode) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "League code is required when joining a league"
    );
  }
  if (leagueOption === "create" && !leagueName) {
    return encodedRedirect(
      "error",
      "/sign-up",
      "League name is required when creating a league"
    );
  }

  let leagueId: string | null = null;

  if (leagueOption === "join") {
    // Verify the league code
    const { data: league, error: leagueError } = await supabase
      .from("leagues")
      .select("id")
      .eq("join_code", leagueCode)
      .single();

    if (leagueError || !league) {
      return encodedRedirect(
        "error",
        "/sign-up",
        "Invalid league code. Please check with your league administrator."
      );
    }
    leagueId = league.id;
  }

  // Create the user account
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
      data: {
        display_name: displayName,
      },
    },
  });

  if (authError) {
    console.error(authError.code + " " + authError.message);
    return encodedRedirect("error", "/sign-up", authError.message);
  }

  if (authData.user) {
    let newLeague;
    if (leagueOption === "create") {
      // Generate a random 6-character join code
      const joinCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Create new league
      const { data: leagueData, error: createLeagueError } = await supabase
        .from("leagues")
        .insert({
          name: leagueName,
          join_code: joinCode,
          created_by: authData.user.id,
        })
        .select()
        .single();

      if (createLeagueError) {
        console.error("League creation error:", createLeagueError);
        return encodedRedirect(
          "error",
          "/sign-up",
          "Account created but league creation failed. Please contact support."
        );
      }

      newLeague = leagueData;
      leagueId = newLeague.id;
    }

    // Update user profile with league association (the trigger already created the basic profile)
    const { error: profileError } = await supabase.rpc(
      "update_user_profile_after_signup",
      {
        user_id: authData.user.id,
        display_name_param: displayName,
        league_id_param: leagueId,
      }
    );

    if (profileError) {
      console.error("Profile creation error:", profileError);
      return encodedRedirect(
        "error",
        "/sign-up",
        "Account created but profile setup failed. Please contact support."
      );
    }

    // Return success message with join code if a new league was created
    if (leagueOption === "create" && newLeague) {
      return encodedRedirect(
        "success",
        "/sign-up",
        `Thanks for signing up! Your league has been created with join code: ${newLeague.join_code}. Share this code with others to let them join. Please check your email for a verification link.`
      );
    }
  }

  return encodedRedirect(
    "success",
    "/sign-up",
    "Thanks for signing up! Please check your email for a verification link."
  );
};

export const signInAction = async (formData: FormData) => {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return encodedRedirect("error", "/sign-in", error.message);
  }

  return redirect("/");
};

export const forgotPasswordAction = async (formData: FormData) => {
  const email = formData.get("email")?.toString();
  const supabase = await createClient();
  const origin = (await headers()).get("origin");
  const callbackUrl = formData.get("callbackUrl")?.toString();

  if (!email) {
    return encodedRedirect("error", "/forgot-password", "Email is required");
  }

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?redirect_to=/protected/reset-password`,
  });

  if (error) {
    console.error(error.message);
    return encodedRedirect(
      "error",
      "/forgot-password",
      "Could not reset password"
    );
  }

  if (callbackUrl) {
    return redirect(callbackUrl);
  }

  return encodedRedirect(
    "success",
    "/forgot-password",
    "Check your email for a link to reset your password."
  );
};

export const resetPasswordAction = async (formData: FormData) => {
  const supabase = await createClient();

  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!password || !confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password and confirm password are required"
    );
  }

  if (password !== confirmPassword) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Passwords do not match"
    );
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  });

  if (error) {
    encodedRedirect(
      "error",
      "/protected/reset-password",
      "Password update failed"
    );
  }

  encodedRedirect("success", "/protected/reset-password", "Password updated");
};

export const signOutAction = async () => {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return redirect("/sign-in");
};
