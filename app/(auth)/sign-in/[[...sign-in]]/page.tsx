import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="neu-raised-lg rounded-4xl p-2">
        <SignIn />
      </div>
    </div>
  );
}
