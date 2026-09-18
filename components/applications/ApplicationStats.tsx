"use client";

import { Cell, Pie, PieChart } from "recharts";
import { Briefcase, ListChecks, Send, Trophy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { ApplicationStatusValues } from "@/servers/validators/job-application.validator";
import { statusLabel, STATUS_COLOR_VAR } from "./StatusBadge";
import type { ApplicationStatus } from "@/generated/prisma";
import type { Application } from "./types";

const STATUS_DESCRIPTION: Record<ApplicationStatus, string> = {
  WISHLIST: "Saved, not applied yet",
  APPLIED: "Application submitted",
  OA: "Online assessment stage",
  INTERVIEW: "In the interview loop",
  OFFER: "Offer received",
  REJECTED: "Didn't move forward",
  GHOSTED: "No response after contact",
  WITHDRAWN: "You withdrew this one",
  NOT_INTERESTED: "You decided to skip this one",
};

export function ApplicationStats({
  viewerAccountId,
  applications,
}: {
  viewerAccountId: string;
  applications: Application[];
}) {
  const total = applications.length;
  if (total === 0) return null;

  const myStatuses = applications.map(
    (app) =>
      app.memberStatuses.find((m) => m.accountId === viewerAccountId)
        ?.status ?? ("WISHLIST" as ApplicationStatus),
  );

  const counts = Object.fromEntries(
    ApplicationStatusValues.map((status) => [
      status,
      myStatuses.filter((s) => s === status).length,
    ]),
  ) as Record<ApplicationStatus, number>;

  const statCards = [
    {
      label: "Total Loker",
      value: total,
      description: "All tracked applications",
      icon: Briefcase,
    },
    {
      label: "Applied",
      value: total - counts.WISHLIST,
      description: "Moved past wishlist",
      icon: Send,
    },
    {
      label: "In Process",
      value: counts.OA + counts.INTERVIEW,
      description: "Assessment or interview stage",
      icon: ListChecks,
    },
    {
      label: "Offers",
      value: counts.OFFER,
      description: "Offers received",
      icon: Trophy,
    },
  ];

  const chartData = ApplicationStatusValues.filter(
    (status) => counts[status] > 0,
  ).map((status) => ({
    status,
    label: statusLabel(status),
    value: counts[status],
    description: STATUS_DESCRIPTION[status],
    fill: STATUS_COLOR_VAR[status],
  }));

  const chartConfig = Object.fromEntries(
    ApplicationStatusValues.map((status) => [
      status,
      { label: statusLabel(status), color: STATUS_COLOR_VAR[status] },
    ]),
  ) satisfies ChartConfig;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-5">
      <div className="grid grid-cols-2 gap-4 lg:col-span-3">
        {statCards.map((stat) => (
          <Card key={stat.label} size="sm">
            <CardContent className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                  {stat.label}
                </p>
                <p className="mt-1 text-2xl font-semibold tabular-nums">
                  {stat.value}
                </p>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">
                  {stat.description}
                </p>
              </div>
              <div className="neu-flat flex size-9 shrink-0 items-center justify-center rounded-full">
                <stat.icon className="text-primary size-4" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card size="sm" className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Status breakdown</CardTitle>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 items-center gap-4">
          <div className="neu-raised-sm flex aspect-square h-full max-h-full shrink-0 items-center justify-center rounded-full p-3">
            <ChartContainer
              config={chartConfig}
              className="aspect-square h-full w-auto"
            >
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      hideLabel
                      nameKey="label"
                      formatter={(value, _name, item) => (
                        <div className="flex min-w-36 flex-col gap-0.5">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="size-2 shrink-0 rounded-[2px]"
                              style={{ backgroundColor: item.payload.fill }}
                            />
                            <span className="font-medium">
                              {item.payload.label}
                            </span>
                            <span className="text-muted-foreground ml-auto font-mono tabular-nums">
                              {value}
                            </span>
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {item.payload.description}
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="label"
                  innerRadius="55%"
                  outerRadius="100%"
                  paddingAngle={2}
                  strokeWidth={2}
                  stroke="var(--background)"
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
          </div>

          <ul className="min-w-0 flex-1 space-y-2">
            {chartData.map((entry) => (
              <li key={entry.status} className="flex items-center gap-2 text-sm">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: entry.fill }}
                />
                <span className="min-w-0 flex-1 truncate">{entry.label}</span>
                <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
                  {entry.value} ·{" "}
                  {Math.round((entry.value / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
