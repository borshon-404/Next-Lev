import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { requireMemberPage } from "@/server/auth/guards";
import { getMlmSettings } from "@/server/mlm/settings-service";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader, CardBody } from "@/components/ui/card";
import { StatCard } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableEmpty, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge";
import { Clock, Landmark, CheckCircle2, FileWarning } from "lucide-react";
import { formatCurrency, formatDateTime, toNumber } from "@/lib/format";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { FileSearch } from "lucide-react";
import { NewWithdrawalDialog, CancelWithdrawalButton } from "./withdrawals-actions";

export const metadata: Metadata = { title: "Withdrawals", robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function WithdrawalsPage() {
  const user = await requireMemberPage();
  const [wallet, settings, kyc, pending, completedAgg, items] = await Promise.all([
    prisma.wallet.findUnique({ where: { userId: user.id } }),
    getMlmSettings(),
    prisma.kyc.findFirst({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, select: { status: true } }),
    prisma.withdrawal.aggregate({ where: { userId: user.id, status: "PENDING" }, _sum: { amount: true } }),
    prisma.withdrawal.aggregate({ where: { userId: user.id, status: "COMPLETED" }, _sum: { netAmount: true } }),
    prisma.withdrawal.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
  ]);

  const kycApproved = kyc?.status === "APPROVED";
  const available = toNumber(wallet?.availableBalance);

  return (
    <>
      <PageHeader
        title="Withdrawals"
        description="Request, track and manage your payout requests."
        actions={
          <Button onClick={undefined}>
            <span className="hidden">placeholder</span>
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
        <StatCard label="Available balance" value={formatCurrency(available)} sub="You can withdraw up to this amount" icon={<Landmark className="h-5 w-5" />} tone="success" />
        <StatCard label="Pending requests" value={formatCurrency(toNumber(pending._sum.amount))} icon={<Clock className="h-5 w-5" />} tone="warning" />
        <StatCard label="Total completed" value={formatCurrency(toNumber(completedAgg._sum.netAmount))} icon={<CheckCircle2 className="h-5 w-5" />} tone="info" />
      </div>

      {settings.kycRequiredForWithdrawal && !kycApproved && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800">
          <FileSearch className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            <strong>Withdrawals are locked.</strong> This platform requires KYC verification before withdrawals.{" "}
            {kyc && kyc.status !== "APPROVED" && "Please "}
            <a href="/kyc" className="font-semibold underline">
              complete your KYC
            </a>{" "}
            to unlock payouts.
          </p>
        </div>
      )}

      <Card className="mt-4">
        <CardHeader
          title="New withdrawal"
          description={`Min ${settings.minWithdrawalNum.toFixed(2)} · Max ${settings.maxWithdrawalNum.toFixed(2)} ${settings.currency} · Fee ${settings.withdrawalFeePercentNum}%${settings.withdrawalFeeFixedNum > 0 ? ` + ${settings.withdrawalFeeFixedNum.toFixed(2)}` : ""}`}
          action={
            <NewWithdrawalDialog
              disabled={settings.kycRequiredForWithdrawal ? !kycApproved : false}
              settings={{
                min: settings.minWithdrawalNum,
                max: settings.maxWithdrawalNum,
                feePercent: settings.withdrawalFeePercentNum,
                feeFixed: settings.withdrawalFeeFixedNum,
                currency: settings.currency,
              }}
            />
          }
        />
        <CardBody>
          <p className="text-sm leading-relaxed text-slate-500">
            When you request a withdrawal, the amount is held from your available balance immediately. An
            administrator reviews each request; approved withdrawals are paid out, rejected or cancelled requests
            refund the held amount automatically. You can never withdraw more than your available balance.
          </p>
        </CardBody>
      </Card>

      <Card className="mt-4">
        <CardHeader title="Withdrawal history" />
        {items.length === 0 ? (
          <EmptyState
            icon={<Landmark className="h-5 w-5" />}
            message="No withdrawals yet"
            description="Once you have an available balance, you can request your first withdrawal here."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Fee</TableHead>
              <TableHead className="text-right">Net</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableHeader>
            <TableBody>
              {items.map((w) => (
                <TableRow key={w.id}>
                  <TableCell className="font-semibold tabular-nums">{formatCurrency(toNumber(w.amount))}</TableCell>
                  <TableCell className="text-right tabular-nums text-slate-500">{formatCurrency(toNumber(w.fee))}</TableCell>
                  <TableCell className="text-right font-medium tabular-nums">{formatCurrency(toNumber(w.netAmount))}</TableCell>
                  <TableCell className="capitalize text-slate-600">{w.paymentMethod}</TableCell>
                  <TableCell>
                    <StatusBadge status={w.status} />
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-slate-500">{formatDateTime(w.createdAt)}</TableCell>
                  <TableCell className="text-right">
                    {w.status === "PENDING" ? <CancelWithdrawalButton id={w.id} /> : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </>
  );
}
