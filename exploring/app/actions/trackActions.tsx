"use server";

import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

export async function deleteTrackTime(formData: FormData) {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("You must be logged in to delete track times");
  }

  // Extract record ID
  const recordId = parseInt(formData.get("id") as string);

  // Verify ownership
  const { data: record } = await supabase
    .from("Track Times")
    .select("user_id")
    .eq("id", recordId)
    .single();

  if (!record || record.user_id !== user.id) {
    throw new Error("Unauthorized: You can only delete your own records");
  }

  // Delete the record
  const { error } = await supabase
    .from("Track Times")
    .delete()
    .eq("id", recordId);

  if (error) {
    console.error("Error deleting track time:", error);
    throw new Error(error.message);
  }

  // Redirect to refresh the page after deletion
  return redirect("/protected/records");
}
