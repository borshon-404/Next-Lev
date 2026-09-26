import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { BusinessError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { getStorage, makeDocumentKey, validateDocumentFile } from "./storage";
import { createNotification } from "../notifications/notification-service";
import { logAudit } from "../audit/audit-service";
import { withTransaction } from "../wallet/wallet-service";

/**
 * KYC module.
 *
 * Documents are stored in private object storage under opaque keys and are
 * only retrievable through the authorized /api/documents route (owner or
 * admin). No public URLs are ever generated.
 */

export const kycSubmitSchema = z.object({
  fullName: z.string().trim().min(2, "Full legal name is required."),
  dateOfBirth: z.string().optional(),
  address: z.string().trim().max(300).optional(),
  documentType: z.enum(["NID", "PASSPORT", "DRIVING_LICENSE", "OTHER"], {
    error: "Choose a document type.",
  }),
  documentNumber: z.string().trim().min(4, "Document number is required.").max(60),
});

export interface KycSubmitInput {
  fullName: string;
  dateOfBirth?: string;
  address?: string;
  documentType: "NID" | "PASSPORT" | "DRIVING_LICENSE" | "OTHER";
  documentNumber: string;
  document: File;
  supporting?: File | null;
}

export async function submitKyc(userId: string, raw: unknown): Promise<{ kycId: string }> {
  const parsed = kycSubmitSchema.safeParse(raw);
  if (!parsed.success) {
    throw new ValidationError(
      parsed.error.issues[0]?.message ?? "Invalid KYC submission.",
      Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0] ?? "form"), [i.message]]))
    );
  }
  const data = parsed.data as KycSubmitInput;

  const pending = await prisma.kyc.findFirst({
    where: { userId, status: { in: ["PENDING", "APPROVED"] } },
  });
  if (pending?.status === "PENDING") {
    throw new BusinessError("You already have a KYC submission under review.");
  }
  if (pending?.status === "APPROVED") {
    throw new BusinessError("Your KYC is already approved.");
  }

  validateDocumentFile(data.document);
  if (data.supporting) validateDocumentFile(data.supporting);

  const storage = getStorage();
  const documentKey = makeDocumentKey(userId, "document", data.document.name);
  await storage.put(documentKey, Buffer.from(await data.document.arrayBuffer()), data.document.type);

  let supportingKey: string | null = null;
  if (data.supporting) {
    supportingKey = makeDocumentKey(userId, "supporting", data.supporting.name);
    await storage.put(supportingKey, Buffer.from(await data.supporting.arrayBuffer()), data.supporting.type);
  }

  const kyc = await prisma.kyc.create({
    data: {
      userId,
      fullName: data.fullName,
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      address: data.address ?? null,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      documentKey,
      supportingKey,
      status: "PENDING",
    },
  });

  return { kycId: kyc.id };
}

export async function reviewKyc(
  kycId: string,
  admin: { id: string },
  decision: "APPROVE" | "REJECT",
  opts: { reason?: string; ip?: string } = {}
): Promise<void> {
  if (decision === "REJECT" && !opts.reason?.trim()) {
    throw new ValidationError("A rejection reason is required.");
  }

  await withTransaction(async (tx) => {
    const kyc = await tx.kyc.findUnique({ where: { id: kycId } });
    if (!kyc) throw new NotFoundError("KYC submission not found.");
    if (kyc.status !== "PENDING") {
      throw new BusinessError(`This KYC submission is already ${kyc.status.toLowerCase()}.`);
    }

    await tx.kyc.update({
      where: { id: kycId },
      data: {
        status: decision === "APPROVE" ? "APPROVED" : "REJECTED",
        rejectionReason: decision === "REJECT" ? opts.reason ?? null : null,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    await createNotification(tx, kyc.userId, {
      type: decision === "APPROVE" ? "KYC_APPROVED" : "KYC_REJECTED",
      title: decision === "APPROVE" ? "KYC approved" : "KYC rejected",
      body:
        decision === "APPROVE"
          ? "Your identity has been verified. You now have full access to platform features."
          : `Your KYC was rejected${opts.reason ? `: ${opts.reason}` : ""}. You can submit again.`,
      link: "/kyc",
    });

    await logAudit(
      admin.id,
      {
        action: `KYC_${decision}`,
        targetType: "Kyc",
        targetId: kycId,
        previousValue: { status: "PENDING" },
        newValue: { status: decision === "APPROVE" ? "APPROVED" : "REJECTED", reason: opts.reason ?? null },
        ip: opts.ip,
      },
      tx
    );
  });
}

/**
 * Authorized document access. Only the document owner or an admin may read a
 * KYC document; everything else gets a 403 — documents are never public.
 */
export async function getKycDocument(
  kycId: string,
  which: "document" | "supporting",
  actor: { id: string; role: string }
): Promise<{ body: Buffer; contentType: string; filename: string }> {
  const kyc = await prisma.kyc.findUnique({ where: { id: kycId } });
  if (!kyc) throw new NotFoundError("KYC submission not found.");
  if (actor.role !== "ADMIN" && kyc.userId !== actor.id) {
    throw new ForbiddenError("You are not allowed to view this document.");
  }
  const key = which === "document" ? kyc.documentKey : kyc.supportingKey;
  if (!key) throw new NotFoundError("Document not found.");

  const stored = await getStorage().get(key);
  const ext = key.slice(key.lastIndexOf("."));
  return {
    body: stored.body,
    contentType: stored.contentType,
    filename: `kyc-${which}-${kyc.id.slice(-6)}${ext}`,
  };
}
