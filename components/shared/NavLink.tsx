"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";

export function NavLink({
  href,
  icon,
  children,
}: {
  href: string;
  /** A rendered icon element, not a component reference — a Server Component
   * (AppShell) can't pass a bare component/function across the client boundary. */
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      className={cn(
        "neu-transition flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium",
        isActive
          ? "neu-active"
          : "text-muted-foreground hover:neu-raised-sm hover:text-foreground",
      )}
    >
      {icon}
      {children}
    </Link>
  );
}
