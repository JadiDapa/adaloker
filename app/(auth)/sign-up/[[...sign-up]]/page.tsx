import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="neu-raised-lg rounded-4xl p-2">
        <SignUp />
      </div>
    </div>
  );
}
