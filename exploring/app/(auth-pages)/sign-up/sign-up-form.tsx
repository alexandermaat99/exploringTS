"use client";

import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import LeagueOptionsHandler, {
  useLeagueOption,
} from "@/components/league-options";
import Link from "next/link";

export function SignUpForm({ searchParams }: { searchParams: Message }) {
  const { setSelectedOption } = useLeagueOption();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 w-full">
      <LeagueOptionsHandler />
      <form className="flex flex-col gap-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Create an account
          </h1>
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              className="text-primary hover:text-primary/90 font-medium"
              href="/sign-in"
            >
              Sign in
            </Link>
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              name="display_name"
              placeholder="Your name"
              required
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              name="password"
              placeholder="Create a password"
              minLength={6}
              required
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Must be at least 6 characters
            </p>
          </div>

          <div className="space-y-3 pt-2">
            <Label>League Options</Label>
            <RadioGroup
              name="league_option"
              defaultValue="join"
              className="space-y-2"
              onValueChange={setSelectedOption}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="join" id="join" />
                <Label htmlFor="join" className="font-normal cursor-pointer">
                  Join existing league
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="create" id="create" />
                <Label htmlFor="create" className="font-normal cursor-pointer">
                  Create new league
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2" data-league-option="join">
            <Label htmlFor="league_code">League Code</Label>
            <Input
              id="league_code"
              name="league_code"
              placeholder="Enter league code"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Enter the code provided by your league administrator
            </p>
          </div>

          <div className="space-y-2" data-league-option="create">
            <Label htmlFor="league_name">League Name</Label>
            <Input
              id="league_name"
              name="league_name"
              placeholder="Enter a name for your league"
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Create a new league that others can join. A join code will be
              generated automatically.
            </p>
          </div>

          <SubmitButton
            className="w-full"
            size="lg"
            formAction={signUpAction}
            pendingText="Creating account..."
          >
            Create account
          </SubmitButton>

          <FormMessage message={searchParams} />
        </div>
      </form>
    </div>
  );
}
