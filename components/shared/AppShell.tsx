import Link from "next/link";
import Image from "next/image";
import { UserButton } from "@clerk/nextjs";
import { LayoutGrid, UserRound } from "lucide-react";
import { ToggleTheme } from "./ToggleTheme";
import { NavLink } from "./NavLink";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  contentClassName,
}: {
  children: React.ReactNode;
  /** Overrides the main content container's max-width — defaults to `max-w-5xl`. */
  contentClassName?: string;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background px-20">
      <header className="neu-raised-sm sticky top-0 z-40 my-6 flex items-center justify-between rounded-full px-6 py-4">
        <Link href="/groups" className="flex items-center gap-2 font-semibold">
          <Image src="/images/logo.png" alt="Adaloker" width={32} height={32} />
          Adaloker
        </Link>
        <nav className="flex items-center gap-3">
          <NavLink href="/groups" icon={<LayoutGrid className="size-4" />}>
            Groups
          </NavLink>
          <NavLink href="/profile" icon={<UserRound className="size-4" />}>
            Profile
          </NavLink>
          <ToggleTheme />
          <UserButton />
        </nav>
      </header>
      <main
        className={cn(" w-full flex-1 px-4 py-6 ", contentClassName)}
      >
        {children}
      </main>
    </div>
  );
}
