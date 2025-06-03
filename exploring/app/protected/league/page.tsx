import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import CopyButton from "@/components/CopyButton";

export default async function LeaguePage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  // Get user's league information
  const { data: userProfile } = await supabase
    .from("user_profiles")
    .select("*, leagues!league_id(*)")
    .eq("id", user.id)
    .single();

  // Get all members in the league
  const { data: leagueMembers } = await supabase
    .from("user_profiles")
    .select("id, display_name")
    .eq("league_id", userProfile?.league_id)
    .order("display_name");

  // Get emails for all members
  const { data: authUsers } = await supabase
    .from("auth_users")
    .select("id, email");

  // Combine the data
  const membersWithEmails =
    leagueMembers?.map((member) => ({
      ...member,
      email: authUsers?.find((u) => u.id === member.id)?.email,
    })) || [];

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-4 sm:space-y-8">
      <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">
          League Information
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              League Name
            </label>
            <p className="text-base sm:text-lg font-semibold break-words">
              {userProfile?.leagues?.name || "No League"}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              League Code
            </label>
            <div className="flex items-center">
              <p className="text-sm sm:text-base font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded break-all flex-1 mr-2">
                {userProfile?.league_id || "No League Code"}
              </p>
              {userProfile?.league_id && (
                <CopyButton text={userProfile.league_id} />
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">
              Share this code with others to join your league
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-700 rounded-lg shadow p-4 sm:p-6">
        <h2 className="text-xl sm:text-2xl font-bold mb-4">League Members</h2>

        <div className="space-y-3 sm:space-y-4">
          {membersWithEmails.map((member) => (
            <div
              key={member.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-gray-200 dark:border-gray-600 pb-3 sm:pb-4 gap-2 sm:gap-4"
            >
              <div className="space-y-1">
                <p className="font-medium text-base sm:text-lg">
                  {member.display_name || "Unnamed Driver"}
                </p>
                <p className="text-xs sm:text-sm text-gray-500 break-all">
                  {member.email}
                </p>
              </div>
              <Link
                href={`/protected/drivers/${member.id}`}
                className="text-blue-500 hover:text-blue-600 text-sm sm:text-base whitespace-nowrap"
              >
                View Profile
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
