import { promises as fs } from "fs";
import path from "path";
import { randomBytes } from "crypto";

/**
 * Object storage abstraction for private files (KYC documents).
 *
 *  - local driver: ./storage/private (development only — Vercel has no
 *    persistent filesystem)
 *  - s3 driver: any S3-compatible object storage (production)
 *
 * Files are stored under opaque random keys and are ONLY ever served through
 * the authorized API route (/api/documents) — never via public URLs.
 */

export interface StoredObject {
  body: Buffer;
  contentType: string;
}

export interface ObjectStorage {
  put(key: string, body: Buffer, contentType: string): Promise<void>;
  get(key: string): Promise<StoredObject>;
  delete(key: string): Promise<void>;
}

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

class LocalStorage implements ObjectStorage {
  private root = path.join(process.cwd(), "storage", "private");

  private fullKey(key: string): string {
    // Guard against path traversal in keys.
    const resolved = path.resolve(this.root, key);
    if (!resolved.startsWith(path.resolve(this.root))) {
      throw new Error("Invalid storage key.");
    }
    return resolved;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const file = this.fullKey(key);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
    await fs.writeFile(`${file}.meta`, contentType, "utf8");
  }

  async get(key: string): Promise<StoredObject> {
    const file = this.fullKey(key);
    const body = await fs.readFile(file);
    const contentType = await fs.readFile(`${file}.meta`, "utf8").catch(() => "application/octet-stream");
    return { body, contentType };
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(this.fullKey(key)).catch(() => {});
    await fs.unlink(`${this.fullKey(key)}.meta`).catch(() => {});
  }
}

class S3Storage implements ObjectStorage {
  private clientPromise?: Promise<import("@aws-sdk/client-s3").S3Client>;
  private bucket = process.env.S3_BUCKET ?? "";

  private async client() {
    if (!this.clientPromise) {
      this.clientPromise = (async () => {
        const { S3Client } = await import("@aws-sdk/client-s3");
        return new S3Client({
          region: process.env.S3_REGION ?? "us-east-1",
          ...(process.env.S3_ENDPOINT ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true } : {}),
        });
      })();
    }
    return this.clientPromise;
  }

  async put(key: string, body: Buffer, contentType: string): Promise<void> {
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.client();
    await client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
        // Defense in depth: objects are private; access only via the app.
        ACL: "private",
      })
    );
  }

  async get(key: string): Promise<StoredObject> {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.client();
    const res = await client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error("Empty object from storage.");
    return {
      body: Buffer.from(bytes),
      contentType: res.ContentType ?? "application/octet-stream",
    };
  }

  async delete(key: string): Promise<void> {
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const client = await this.client();
    await client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

let storageInstance: ObjectStorage | null = null;

export function getStorage(): ObjectStorage {
  if (!storageInstance) {
    storageInstance = process.env.STORAGE_DRIVER === "s3" ? new S3Storage() : new LocalStorage();
  }
  return storageInstance;
}

export const ALLOWED_DOCUMENT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5 MB

/** Build an opaque storage key with a safe extension. */
export function makeDocumentKey(userId: string, purpose: "document" | "supporting", originalName: string): string {
  const ext = path.extname(originalName).toLowerCase();
  if (!CONTENT_TYPES[ext]) throw new Error("Unsupported file type.");
  return `kyc/${userId}/${Date.now()}-${purpose}-${randomBytes(8).toString("hex")}${ext}`;
}

export function validateDocumentFile(file: File): void {
  if (!ALLOWED_DOCUMENT_TYPES.includes(file.type)) {
    throw new Error("Only JPG, PNG, WEBP or PDF files are allowed.");
  }
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error("File is too large (max 5 MB).");
  }
}
