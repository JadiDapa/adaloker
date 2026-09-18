import { Badge } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/generated/prisma";
import { cn } from "@/lib/utils";

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  WISHLIST: "Wishlist",
  APPLIED: "Applied",
  OA: "Online Assessment",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  REJECTED: "Rejected",
  GHOSTED: "Ghosted",
  WITHDRAWN: "Withdrawn",
};

const STATUS_CLASS: Record<ApplicationStatus, string> = {
  WISHLIST: "bg-status-wishlist/15 text-status-wishlist",
  APPLIED: "bg-status-applied/15 text-status-applied",
  OA: "bg-status-oa/15 text-status-oa",
  INTERVIEW: "bg-status-interview/15 text-status-interview",
  OFFER: "bg-status-offer/15 text-status-offer",
  REJECTED: "bg-status-rejected/15 text-status-rejected",
  GHOSTED: "bg-status-ghosted/15 text-status-ghosted",
  WITHDRAWN: "bg-status-withdrawn/15 text-status-withdrawn",
};

/** Status → categorical chart color, kept in sync with the badge palette above. */
export const STATUS_COLOR_VAR: Record<ApplicationStatus, string> = {
  WISHLIST: "var(--status-wishlist)",
  APPLIED: "var(--status-applied)",
  OA: "var(--status-oa)",
  INTERVIEW: "var(--status-interview)",
  OFFER: "var(--status-offer)",
  REJECTED: "var(--status-rejected)",
  GHOSTED: "var(--status-ghosted)",
  WITHDRAWN: "var(--status-withdrawn)",
};

export function statusLabel(status: ApplicationStatus) {
  return STATUS_LABEL[status];
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  return (
    <Badge className={cn("border-none font-medium", STATUS_CLASS[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}
