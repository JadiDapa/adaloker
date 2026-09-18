"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { toast } from "sonner";
import Link from "next/link";
import { format } from "date-fns";
import {
  Trash2,
  CalendarDays,
  Info,
  ExternalLink,
  Search,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Plus,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, statusLabel } from "./StatusBadge";
import { ApplicationDetailSheet } from "./ApplicationDetailSheet";
import { EditableField, SalaryField } from "./EditableField";
import { SOURCE_PLATFORM_DATALIST_ID } from "./source-platforms";
import {
  createJobApplication,
  deleteJobApplication,
  updateMyApplicationStatus,
  updateJobApplicationFields,
} from "@/app/action/job-application.action";
import { ApplicationStatusValues } from "@/servers/validators/job-application.validator";
import type { ApplicationStatus } from "@/generated/prisma";
import { firstName, cn } from "@/lib/utils";
import type { Application } from "./types";

type ColumnId =
  | "rowNumber"
  | "company"
  | "position"
  | "status"
  | "sourcePlatform"
  | "salary"
  | "appliedUsers"
  | "addedBy"
  | "actions";

const COLUMNS: {
  id: ColumnId;
  label: string;
  width: number;
  minWidth: number;
  resizable?: boolean;
  sortable?: boolean;
}[] = [
  { id: "rowNumber", label: "#", width: 32, minWidth: 32 },
  {
    id: "company",
    label: "Company",
    width: 170,
    minWidth: 130,
    resizable: true,
    sortable: true,
  },
  {
    id: "position",
    label: "Position",
    width: 170,
    minWidth: 120,
    resizable: true,
    sortable: true,
  },
  {
    id: "status",
    label: "Status",
    width: 170,
    minWidth: 130,
    resizable: true,
    sortable: true,
  },
  {
    id: "sourcePlatform",
    label: "Source",
    width: 120,
    minWidth: 90,
    resizable: true,
    sortable: true,
  },
  {
    id: "salary",
    label: "Salary",
    width: 110,
    minWidth: 80,
    resizable: true,
    sortable: true,
  },
  {
    id: "appliedUsers",
    label: "Applied users",
    width: 170,
    minWidth: 120,
    resizable: true,
    sortable: true,
  },
  {
    id: "addedBy",
    label: "Added by",
    width: 100,
    minWidth: 80,
    resizable: true,
    sortable: true,
  },
  { id: "actions", label: "", width: 96, minWidth: 96 },
];

const STATUS_FILTER_ALL = "ALL" as const;
type StatusFilter = typeof STATUS_FILTER_ALL | ApplicationStatus;
const ADDED_BY_FILTER_ALL = "ALL" as const;
const APPLIED_FILTER_ALL = "ALL" as const;
type AppliedFilter = typeof APPLIED_FILTER_ALL | "APPLIED" | "NOT_APPLIED";
type SortDirection = "asc" | "desc";

function getMemberStatus(app: Application, viewerAccountId: string) {
  return app.memberStatuses.find((m) => m.accountId === viewerAccountId);
}

/** Extracts a comparable value for each sortable column — numeric where it
 * makes sense (dates, salary, headcount) so sorting is by magnitude, not
 * lexical string order. */
function getSortValue(
  app: Application,
  viewerAccountId: string,
  key: ColumnId,
): string | number {
  switch (key) {
    case "company":
      return app.company.toLowerCase();
    case "position":
      return app.position.toLowerCase();
    case "status": {
      const status = getMemberStatus(app, viewerAccountId)?.status ?? "WISHLIST";
      return ApplicationStatusValues.indexOf(status);
    }
    case "sourcePlatform":
      return (app.sourcePlatform ?? "").toLowerCase();
    case "salary": {
      const digits = (app.salary ?? "").replace(/[^0-9]/g, "");
      return digits ? Number(digits) : -Infinity;
    }
    case "appliedUsers":
      return app.memberStatuses.filter((m) => m.status !== "WISHLIST").length;
    case "addedBy":
      return app.createdBy.name.toLowerCase();
    default:
      return 0;
  }
}

const MAX_COLUMN_WIDTH = 600;
/** A sliver of trailing, unstyled column so the row's shadow (applied to
 * the <tr>, which doesn't clip to border-radius) has room to bleed past the
 * last visible cell without visibly cutting into its rounded corner. */
const FILLER_WIDTH = 8;
/** Width of the pinned row-number column — the Company column sticks right after it. */
const ROW_NUMBER_WIDTH = 32;

/** Drag handle on a column's right edge — mirrors Excel's column-resize gesture. */
function ResizeHandle({ onResize }: { onResize: (dx: number) => void }) {
  const lastX = useRef(0);

  const handlePointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    lastX.current = e.clientX;

    const handleMove = (ev: PointerEvent) => {
      const dx = ev.clientX - lastX.current;
      lastX.current = ev.clientX;
      onResize(dx);
    };
    const handleUp = () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      className="absolute top-0 right-0 z-10 h-full w-2 cursor-col-resize touch-none select-none hover:bg-primary/40 active:bg-primary/60"
    />
  );
}

export function ApplicationsTable({
  groupId,
  viewerAccountId,
  applications,
}: {
  groupId: string;
  viewerAccountId: string;
  applications: Application[];
}) {
  const [widths, setWidths] = useState<Record<ColumnId, number>>(
    () =>
      Object.fromEntries(COLUMNS.map((c) => [c.id, c.width])) as Record<
        ColumnId,
        number
      >,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scroll, setScroll] = useState({ left: false, right: false });
  const [containerWidth, setContainerWidth] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(STATUS_FILTER_ALL);
  const [addedByFilter, setAddedByFilter] = useState<string>(ADDED_BY_FILTER_ALL);
  const [appliedFilter, setAppliedFilter] = useState<AppliedFilter>(APPLIED_FILTER_ALL);
  const [sortKey, setSortKey] = useState<ColumnId | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>("asc");

  const toggleSort = (id: ColumnId) => {
    if (sortKey === id) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(id);
      setSortDir("asc");
    }
  };

  const creators = useMemo(() => {
    const byId = new Map(applications.map((app) => [app.createdBy.id, app.createdBy]));
    return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [applications]);

  const visibleApplications = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = applications.filter((app) => {
      const matchesSearch =
        !query ||
        [app.company, app.position, app.location ?? "", app.salary ?? "", app.sourcePlatform ?? ""].some(
          (field) => field.toLowerCase().includes(query),
        );
      const matchesStatus =
        statusFilter === STATUS_FILTER_ALL ||
        (getMemberStatus(app, viewerAccountId)?.status ?? "WISHLIST") === statusFilter;
      const matchesAddedBy =
        addedByFilter === ADDED_BY_FILTER_ALL || app.createdBy.id === addedByFilter;
      const myStatus = getMemberStatus(app, viewerAccountId)?.status ?? "WISHLIST";
      const matchesApplied =
        appliedFilter === APPLIED_FILTER_ALL ||
        (appliedFilter === "APPLIED" ? myStatus !== "WISHLIST" : myStatus === "WISHLIST");
      return matchesSearch && matchesStatus && matchesAddedBy && matchesApplied;
    });

    if (!sortKey) return filtered;

    return [...filtered].sort((a, b) => {
      const va = getSortValue(a, viewerAccountId, sortKey);
      const vb = getSortValue(b, viewerAccountId, sortKey);
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [
    applications,
    search,
    statusFilter,
    addedByFilter,
    appliedFilter,
    sortKey,
    sortDir,
    viewerAccountId,
  ]);

  const updateScrollShadows = () => {
    const el = scrollRef.current;
    if (!el) return;
    setScroll({
      left: el.scrollLeft > 4,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 4,
    });
  };

  useEffect(() => {
    updateScrollShadows();
    window.addEventListener("resize", updateScrollShadows);
    return () => window.removeEventListener("resize", updateScrollShadows);
  }, [applications.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) =>
      setContainerWidth(entry.contentRect.width),
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const resizeColumn = (id: ColumnId, minWidth: number, dx: number) => {
    setWidths((w) => ({
      ...w,
      [id]: Math.min(MAX_COLUMN_WIDTH, Math.max(minWidth, w[id] + dx)),
    }));
  };

  // Stretch resizable columns to absorb any leftover space so the table
  // always fills its container instead of leaving a blank trailing gap.
  const totalWidth = COLUMNS.reduce((sum, c) => sum + widths[c.id], 0);
  const resizableWidth = COLUMNS.filter((c) => c.resizable).reduce(
    (sum, c) => sum + widths[c.id],
    0,
  );
  const extraSpace = Math.max(0, containerWidth - totalWidth - FILLER_WIDTH);
  const renderWidths = Object.fromEntries(
    COLUMNS.map((c) => [
      c.id,
      c.resizable && resizableWidth > 0
        ? widths[c.id] + extraSpace * (widths[c.id] / resizableWidth)
        : widths[c.id],
    ]),
  ) as Record<ColumnId, number>;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-40 flex-1">
          <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search company, position, location, salary..."
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as StatusFilter)}
        >
          <SelectTrigger className="w-44 shrink-0">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={STATUS_FILTER_ALL}>All statuses</SelectItem>
            {ApplicationStatusValues.map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={addedByFilter} onValueChange={setAddedByFilter}>
          <SelectTrigger className="w-44 shrink-0">
            <SelectValue placeholder="Added by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ADDED_BY_FILTER_ALL}>All members</SelectItem>
            {creators.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {firstName(c.name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={appliedFilter}
          onValueChange={(v) => setAppliedFilter(v as AppliedFilter)}
        >
          <SelectTrigger className="w-44 shrink-0">
            <SelectValue placeholder="Applied by me" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={APPLIED_FILTER_ALL}>Applied by me: Any</SelectItem>
            <SelectItem value="APPLIED">Applied by me</SelectItem>
            <SelectItem value="NOT_APPLIED">Not applied yet</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {applications.length > 0 && visibleApplications.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          No applications match your search or filters.
        </p>
      ) : (
        <div className="relative">
          <div
            ref={scrollRef}
            onScroll={updateScrollShadows}
            className="scrollbar-thin overflow-x-auto rounded-2xl pr-1 pb-2.5 [scrollbar-color:var(--border)_transparent] [&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:hover:bg-muted-foreground/50 [&::-webkit-scrollbar-track]:bg-transparent"
          >
            <Table className="w-full table-fixed border-separate [border-spacing:0_0.5rem]">
              <colgroup>
                {COLUMNS.map((c) => (
                  <col key={c.id} style={{ width: renderWidths[c.id] }} />
                ))}
                <col style={{ width: FILLER_WIDTH }} />
              </colgroup>
              <TableHeader className="neu-flat rounded-xl [&_tr]:border-none">
                <TableRow className="hover:neu-flat">
                  {COLUMNS.map((c) => (
                    <TableHead
                      key={c.id}
                      style={
                        c.id === "company" ? { left: ROW_NUMBER_WIDTH } : undefined
                      }
                      onClick={c.sortable ? () => toggleSort(c.id) : undefined}
                      className={cn(
                        "neu-flat relative text-xs font-semibold tracking-wide text-muted-foreground uppercase",
                        c.id === "rowNumber" && "sticky left-0 z-20 text-center",
                        c.id === "company" &&
                          "sticky z-20 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]",
                        c.sortable && "cursor-pointer select-none hover:text-foreground",
                      )}
                    >
                      <span className="inline-flex items-center gap-1">
                        {c.label}
                        {c.sortable &&
                          (sortKey === c.id ? (
                            sortDir === "asc" ? (
                              <ArrowUp className="size-3" />
                            ) : (
                              <ArrowDown className="size-3" />
                            )
                          ) : (
                            <ArrowUpDown className="size-3 opacity-40" />
                          ))}
                      </span>
                      {c.resizable && (
                        <ResizeHandle
                          onResize={(dx) => resizeColumn(c.id, c.minWidth, dx)}
                        />
                      )}
                    </TableHead>
                  ))}
                  <TableHead className="neu-flat" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleApplications.map((app, index) => (
                  <ApplicationRow
                    key={app.id}
                    rowNumber={index + 1}
                    groupId={groupId}
                    viewerAccountId={viewerAccountId}
                    application={app}
                  />
                ))}
                <QuickAddRow groupId={groupId} />
              </TableBody>
            </Table>
          </div>

          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 left-0 w-8 bg-linear-to-r from-background to-transparent transition-opacity",
              scroll.left ? "opacity-100" : "opacity-0",
            )}
          />
          <div
            aria-hidden
            className={cn(
              "pointer-events-none absolute inset-y-0 right-0 w-8 bg-linear-to-l from-background to-transparent transition-opacity",
              scroll.right ? "opacity-100" : "opacity-0",
            )}
          />
        </div>
      )}
    </div>
  );
}

const EMPTY_DRAFT = { company: "", position: "", location: "", salary: "" };

/** A permanent blank row pinned to the bottom of the table — type company +
 * position directly into the cells (Notion-style) and hit Enter to save,
 * instead of opening the "Add application" sheet. Everything past those two
 * is optional and can be filled in later from the row itself. */
function QuickAddRow({ groupId }: { groupId: string }) {
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [isPending, startTransition] = useTransition();

  const canSave = draft.company.trim() !== "" && draft.position.trim() !== "";

  const commit = () => {
    if (!canSave || isPending) return;
    startTransition(async () => {
      const result = await createJobApplication(groupId, {
        company: draft.company.trim(),
        position: draft.position.trim(),
        location: draft.location.trim(),
        jobUrl: "",
        salary: draft.salary.trim(),
        sourcePlatform: "",
        status: "APPLIED",
        appliedAt: "",
        notes: "",
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDraft(EMPTY_DRAFT);
    });
  };

  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") commit();
  };

  return (
    <TableRow className="neu-flat rounded-xl border-dashed [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl">
      <TableCell className="neu-flat text-muted-foreground sticky left-0 z-10 px-1 text-center text-sm">
        <Plus className="mx-auto size-3.5" />
      </TableCell>
      <TableCell
        style={{ left: ROW_NUMBER_WIDTH }}
        className="neu-flat sticky z-10 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]"
      >
        <Input
          value={draft.company}
          disabled={isPending}
          onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))}
          onKeyDown={onEnter}
          placeholder="Company…"
          className="h-8 border-none bg-transparent px-1 shadow-none focus-visible:ring-0"
        />
      </TableCell>
      <TableCell>
        <Input
          value={draft.position}
          disabled={isPending}
          onChange={(e) => setDraft((d) => ({ ...d, position: e.target.value }))}
          onKeyDown={onEnter}
          placeholder="Position…"
          className="h-8 border-none bg-transparent px-1 shadow-none focus-visible:ring-0"
        />
      </TableCell>
      <TableCell />
      <TableCell />
      <TableCell>
        <Input
          value={draft.salary}
          disabled={isPending}
          onChange={(e) => setDraft((d) => ({ ...d, salary: e.target.value }))}
          onKeyDown={onEnter}
          placeholder="Salary…"
          className="h-8 border-none bg-transparent px-1 shadow-none focus-visible:ring-0"
        />
      </TableCell>
      <TableCell />
      <TableCell />
      <TableCell>
        <Button
          size="icon"
          className="size-8"
          disabled={!canSave || isPending}
          onClick={commit}
          title="Add loker"
        >
          <Plus className="size-4" />
        </Button>
      </TableCell>
      <TableCell />
    </TableRow>
  );
}

function ApplicationRow({
  rowNumber,
  groupId,
  viewerAccountId,
  application,
}: {
  rowNumber: number;
  groupId: string;
  viewerAccountId: string;
  application: Application;
}) {
  const [isPending, startTransition] = useTransition();

  const myStatusRow = application.memberStatuses.find(
    (m) => m.accountId === viewerAccountId,
  );
  const myStatus: ApplicationStatus = myStatusRow?.status ?? "WISHLIST";
  const myAppliedAt = myStatusRow?.appliedAt ?? null;

  const appliedUsers = application.memberStatuses.filter(
    (m) => m.status !== "WISHLIST",
  );

  const handleStatusChange = (status: string) => {
    startTransition(async () => {
      const result = await updateMyApplicationStatus(groupId, application.id, {
        status,
        ...(status !== "WISHLIST" && !myAppliedAt
          ? { appliedAt: new Date().toISOString().slice(0, 10) }
          : {}),
      });
      if (!result.ok) toast.error(result.error);
    });
  };

  const handleAppliedAtChange = (value: string) => {
    startTransition(async () => {
      const result = await updateMyApplicationStatus(groupId, application.id, {
        appliedAt: value,
      });
      if (!result.ok) toast.error(result.error);
    });
  };

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteJobApplication(groupId, application.id);
      if (!result.ok) toast.error(result.error);
      else toast.success(result.message);
    });
  };

  const handleFieldSave = (
    field: "company" | "position" | "location" | "salary" | "sourcePlatform",
    value: string,
  ) => {
    startTransition(async () => {
      const result = await updateJobApplicationFields(groupId, application.id, {
        [field]: value,
      });
      if (!result.ok) toast.error(result.error);
    });
  };

  return (
    <TableRow
      className={cn(
        "neu-raised-sm rounded-xl [&>td:first-child]:rounded-l-xl [&>td:last-child]:rounded-r-xl hover:neu-raised",
        isPending && "opacity-60",
      )}
    >
      <TableCell className="neu-flat text-muted-foreground sticky left-0 z-10 px-1 text-center text-sm">
        {rowNumber}
      </TableCell>
      <TableCell
        style={{ left: ROW_NUMBER_WIDTH }}
        className="neu-flat sticky z-10 overflow-hidden text-ellipsis shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]"
      >
        <div className="flex items-center gap-1">
          <EditableField
            value={application.company}
            onSave={(v) => handleFieldSave("company", v)}
            required
            className="font-medium"
          />
          {application.jobUrl && (
            <Link
              href={application.jobUrl}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground shrink-0"
              title={application.jobUrl}
            >
              <ExternalLink className="size-3.5" />
            </Link>
          )}
        </div>
        <EditableField
          value={application.location ?? ""}
          onSave={(v) => handleFieldSave("location", v)}
          placeholder="Location"
          className="text-muted-foreground text-xs font-normal"
        />
      </TableCell>
      <TableCell className="overflow-hidden text-ellipsis">
        <EditableField
          value={application.position}
          onSave={(v) => handleFieldSave("position", v)}
          required
        />
      </TableCell>
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <Select value={myStatus} onValueChange={handleStatusChange}>
            <SelectTrigger className="h-auto w-auto border-none p-0 shadow-none [&_svg]:hidden">
              <StatusBadge status={myStatus} />
            </SelectTrigger>
            <SelectContent>
              {ApplicationStatusValues.map((s) => (
                <SelectItem key={s} value={s}>
                  {statusLabel(s)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground h-auto px-1 py-0 text-xs font-normal"
              >
                <CalendarDays className="size-3" />
                {myAppliedAt ? format(myAppliedAt, "MMM d, yyyy") : `${statusLabel(myStatus)} date`}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto space-y-2">
              <Input
                type="date"
                defaultValue={
                  myAppliedAt ? format(myAppliedAt, "yyyy-MM-dd") : ""
                }
                onChange={(e) => handleAppliedAtChange(e.target.value)}
              />
            </PopoverContent>
          </Popover>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground overflow-hidden text-sm text-ellipsis">
        <EditableField
          value={application.sourcePlatform ?? ""}
          onSave={(v) => handleFieldSave("sourcePlatform", v)}
          placeholder="—"
          list={SOURCE_PLATFORM_DATALIST_ID}
        />
      </TableCell>
      <TableCell className="text-muted-foreground overflow-hidden text-sm text-ellipsis">
        <SalaryField
          value={application.salary ?? ""}
          onSave={(v) => handleFieldSave("salary", v)}
        />
      </TableCell>
      <TableCell className="overflow-hidden">
        {appliedUsers.length === 0 ? (
          <span className="text-muted-foreground text-sm">—</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {appliedUsers.map((m) => (
              <Badge
                key={m.accountId}
                variant="secondary"
                className="font-normal"
              >
                {firstName(m.account.name)}
              </Badge>
            ))}
          </div>
        )}
      </TableCell>
      <TableCell className="text-muted-foreground overflow-hidden text-sm text-ellipsis">
        <span className="truncate">
          {firstName(application.createdBy.name)}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center justify-end gap-1">
          <ApplicationDetailSheet
            groupId={groupId}
            viewerAccountId={viewerAccountId}
            application={application}
          >
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              title="View details"
            >
              <Info className="size-4" />
            </Button>
          </ApplicationDetailSheet>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-destructive hover:text-destructive"
            disabled={isPending}
            onClick={handleDelete}
            title="Delete"
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </TableCell>
      <TableCell />
    </TableRow>
  );
}
