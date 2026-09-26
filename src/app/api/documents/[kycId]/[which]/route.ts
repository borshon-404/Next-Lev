import { auth } from "@/auth";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { getKycDocument } from "@/server/kyc/kyc-service";

export const dynamic = "force-dynamic";

/**
 * Authorized delivery of KYC documents.
 * - Only the document owner or an ADMIN may read a document.
 * - No public URLs are ever generated; this route re-checks authorization
 *   on every request and streams the bytes with a non-cacheable response.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ kycId: string; which: string }> }
) {
  const { kycId, which } = await params;
  if (which !== "document" && which !== "supporting") {
    return new Response("Not found", { status: 404 });
  }

  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const doc = await getKycDocument(kycId, which as "document" | "supporting", {
      id: session.user.id,
      role: session.user.role,
    });
    return new Response(new Uint8Array(doc.body), {
      headers: {
        "Content-Type": doc.contentType,
        "Content-Disposition": `attachment; filename="${doc.filename}"`,
        "Cache-Control": "no-store, private",
      },
    });
  } catch (e) {
    if (e instanceof ForbiddenError) return new Response("Forbidden", { status: 403 });
    if (e instanceof NotFoundError) return new Response("Not found", { status: 404 });
    console.error("[documents] failed:", e);
    return new Response("Something went wrong.", { status: 500 });
  }
}
