import type { Metadata } from "next";
import { requireAdminPage } from "@/server/auth/guards";
import { getReport, type ReportType } from "@/server/reports/report-service";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { BarChart3, Download } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { ReportControls } from "./report-controls";

export const metadata: Metadata = { title: "Reports", robots: { index: false } };
export const dynamic = "force-dynamic";

const REPORT_TYPES: { id: ReportType; label: string }[] = [
  { id: "members", label: "Member growth" },
  { id: "sales", label: "Sales" },
  { id: "purchases", label: "All purchases" },
  { id: "commissions", label: "Commissions" },
  { id: "withdrawals", label: "Withdrawals" },
  { id: "deposits", label: "Deposits" },
];

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 days" },
  { value: "last30", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const type = (REPORT_TYPES.some((r) => r.id === params.type) ? params.type : "sales") as ReportType;
  const range = typeof params.range === "string" ? params.range : "last30";
  const from = typeof params.from === "string" ? params.from : "";
  const to = typeof params.to === "string" ? params.to : "";

  const report = await getReport(type, range as never, from || undefined, to || undefined);

  const exportUrl = (() => {
    const p = new URLSearchParams({ range, type });
    if (from) p.set("from", from);
    if (to) p.set("to", to);
    return `/api/reports/${type}?${p.toString()}`;
  })();

  return (
    <>
      <PageHeader
        title="Reports"
        description="Platform analytics with date ranges and CSV export."
        actions={
          <a href={exportUrl}>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4" /> Export CSV
            </Button>
          </a>
        }
      />

      <ReportControls
        type={type}
        range={range}
        from={from}
        to={to}
        types={REPORT_TYPES.map((r) => ({ value: r.id, label: r.label }))}
        ranges={RANGE_OPTIONS}
      />

      <Card className="mt-4">
        <CardHeader
          title={`${REPORT_TYPES.find((r) => r.id === type)?.label ?? "Report"} · ${report.total} records`}
          description={
            report.range.from
              ? `${report.range.from.toLocaleDateString()} → ${report.range.to?.toLocaleDateString() ?? "now"}`
              : "All time"
          }
        />
        {report.rows.length === 0 ? (
          <EmptyState icon={<BarChart3 className="h-5 w-5" />} message="No data for this range" description="Try a wider date range or a different report." />
        ) : (
          <Table>
            <TableHeader>
              {report.headers.map((h) => (
                <TableHead key={h}>{h}</TableHead>
              ))}
            </TableHeader>
            <TableBody>
              {report.rows.slice(0, 200).map((row, i) => (
                <TableRow key={i}>
                  {row.map((cell, j) => (
                    <TableCell key={j} className="whitespace-nowrap">
                      {typeof cell === "number" ? cell.toLocaleString("en-US") : String(cell)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
        {report.rows.length > 200 && (
          <CardBody className="border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-400">
              Showing the first 200 of {report.total} rows — use the CSV export for the full dataset.
            </p>
          </CardBody>
        )}
      </Card>
    </>
  );
}
