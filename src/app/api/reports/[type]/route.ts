import { auth } from "@/auth";
import { ForbiddenError } from "@/lib/errors";
import { getReport, type ReportType } from "@/server/reports/report-service";
import { buildCsv, csvResponse } from "@/lib/csv";

export const dynamic = "force-dynamic";

const ALLOWED: ReportType[] = ["members", "sales", "purchases", "commissions", "withdrawals", "deposits"];

/** Admin-only CSV export for reports. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ type: string }> }
) {
  const { type } = await params;
  if (!ALLOWED.includes(type as ReportType)) {
    return new Response("Unknown report", { status: 404 });
  }

  const session = await auth();
  if (!session?.user) return new Response("Unauthorized", { status: 401 });
  if (session.user.role !== "ADMIN") {
    throw new ForbiddenError();
  }

  const url = new URL(_req.url);
  const range = url.searchParams.get("range") ?? "last30";
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;

  const report = await getReport(type as ReportType, range as never, from, to);
  const csv = buildCsv(report.headers, report.rows);
  return csvResponse(`nexlev-${type}-${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
