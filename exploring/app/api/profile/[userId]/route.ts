import { createClient } from "@/utils/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const supabase = await createClient();
    const { userId } = await params;

    // Verify the requesting user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("display_name")
      .eq("id", userId)
      .single();

    if (error) {
      console.error("Profile API error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Profile API catch error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
