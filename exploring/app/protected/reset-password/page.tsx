import { resetPasswordAction } from "@/app/actions";
import { FormMessage, Message } from "@/components/form-message";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function ResetPassword(props: {
  searchParams: Promise<Message>;
}) {
  const searchParams = await props.searchParams;
  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4 py-6">
      <form className="w-full max-w-md bg-white dark:bg-slate-700 rounded-lg shadow p-6 space-y-4">
        <div className="space-y-2">
          <h1 className="text-xl sm:text-2xl font-medium">Reset password</h1>
          <p className="text-sm text-foreground/60">
            Please enter your new password below.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              type="password"
              name="password"
              id="password"
              placeholder="New password"
              required
              className="w-full"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              type="password"
              name="confirmPassword"
              id="confirmPassword"
              placeholder="Confirm password"
              required
              className="w-full"
            />
          </div>
        </div>

        <SubmitButton formAction={resetPasswordAction} className="w-full">
          Reset password
        </SubmitButton>

        <FormMessage message={searchParams} />
      </form>
    </div>
  );
}
