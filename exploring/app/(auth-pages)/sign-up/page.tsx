import { signUpAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import LeagueOptionsHandler, {
  LeagueOptionProvider,
  useLeagueOption,
} from "@/components/league-options";
import Link from "next/link";
import { SmtpMessage } from "../smtp-message";

// Create a separate client component file for the form
import { SignUpForm } from "./sign-up-form";

export default async function SignUpPage(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  if ("message" in searchParams) {
    return (
      <div className="w-full flex-1 flex items-center justify-center gap-2 p-4">
        <FormMessage message={searchParams} />
      </div>
    );
  }

  return (
    <LeagueOptionProvider>
      <SignUpForm searchParams={searchParams} />
    </LeagueOptionProvider>
  );
}
