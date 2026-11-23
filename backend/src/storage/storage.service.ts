import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createHash, randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { setTimeout as delay } from "node:timers/promises";

export type ProjectImageKind = "images" | "backgrounds";
export type SupportedImageExtension = "jpg" | "png" | "webp";

const objectKeyPattern =
  /^projects\/(?:images|backgrounds)\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i;
const migratedObjectKeyPattern =
  /^projects\/migrated\/(?:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}|[0-9a-f]{64})\.(?:jpg|png|webp)$/i;
const preservedStaticImages = new Set([
  "/assets/about-building.png",
  "/assets/favicon.png",
  "/assets/favicon.svg",
]);

type StoredImage = {
  body: Readable;
  contentType: string;
  contentLength?: number;
  etag?: string;
};

function getErrorName(error: unknown): string | undefined {
  if (!error || typeof error !== "object") return undefined;
  if ("code" in error && typeof error.code === "string") return error.code;
  return error instanceof Error ? error.name : undefined;
}

function getErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object" || !("$metadata" in error)) {
    return undefined;
  }
  const metadata = error.$metadata;
  return metadata && typeof metadata === "object" && "httpStatusCode" in metadata
    ? Number(metadata.httpStatusCode)
    : undefined;
}

function isMissingObject(error: unknown): boolean {
  return (
    ["NoSuchKey", "NotFound"].includes(getErrorName(error) ?? "") ||
    getErrorStatus(error) === 404
  );
}

function isMissingBucket(error: unknown): boolean {
  return (
    ["NoSuchBucket", "NotFound"].includes(getErrorName(error) ?? "") ||
    getErrorStatus(error) === 404
  );
}

function isBucketAlreadyCreated(error: unknown): boolean {
  return ["BucketAlreadyExists", "BucketAlreadyOwnedByYou"].includes(
    getErrorName(error) ?? "",
  );
}

function isRetryable(error: unknown): boolean {
  const name = getErrorName(error);
  return (
    ["TimeoutError", "NetworkingError", "ECONNREFUSED", "ECONNRESET"].includes(
      name ?? "",
    ) ||
    (getErrorStatus(error) !== undefined && getErrorStatus(error)! >= 500)
  );
}

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} must be configured for RustFS storage.`);
  }
  return value;
}

@Injectable()
export class StorageService implements OnModuleInit, OnModuleDestroy {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefix: string;
  private readonly publicApiOrigin: string | null;

  constructor() {
    const endpoint = requiredEnvironmentValue("RUSTFS_ENDPOINT");
    const endpointUrl = new URL(endpoint);
    if (endpointUrl.protocol !== "http:" && endpointUrl.protocol !== "https:") {
      throw new Error("RUSTFS_ENDPOINT must use HTTP or HTTPS.");
    }

    this.bucket = requiredEnvironmentValue("RUSTFS_BUCKET");
    this.prefix = this.normalizePrefix(process.env.RUSTFS_OBJECT_PREFIX ?? "");
    this.publicApiOrigin = process.env.PUBLIC_API_URL
      ? new URL(process.env.PUBLIC_API_URL).origin
      : null;
    this.client = new S3Client({
      endpoint: endpointUrl.origin,
      region: requiredEnvironmentValue("RUSTFS_REGION"),
      credentials: {
        accessKeyId: requiredEnvironmentValue("RUSTFS_ACCESS_KEY"),
        secretAccessKey: requiredEnvironmentValue("RUSTFS_SECRET_KEY"),
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit(): Promise<void> {
    await this.ensureBucket();
  }

  onModuleDestroy(): void {
    this.client.destroy();
  }

  createProjectImageKey(
    kind: ProjectImageKind,
    extension: SupportedImageExtension,
  ): string {
    return this.withPrefix(`projects/${kind}/${randomUUID()}.${extension}`);
  }

  createMigratedProjectImageKey(
    sourceIdentity: string,
    extension: SupportedImageExtension,
  ): string {
    const digest = createHash("sha256").update(sourceIdentity).digest("hex");
    return this.withPrefix(`projects/migrated/${digest}.${extension}`);
  }

  isObjectKey(value: string): boolean {
    const key = this.withoutPrefix(value);
    return objectKeyPattern.test(key) || migratedObjectKeyPattern.test(key);
  }

  isPreservedStaticImage(value: string): boolean {
    return preservedStaticImages.has(value);
  }

  objectKeyFromReference(reference: string): string {
    if (this.isObjectKey(reference)) return reference;

    let imageUrl: URL;
    try {
      imageUrl = new URL(reference, "http://portfolio.local");
    } catch {
      throw new BadRequestException("Image references must come from the image upload service.");
    }

    if (
      imageUrl.origin !== "http://portfolio.local" &&
      imageUrl.origin !== this.publicApiOrigin
    ) {
      throw new BadRequestException("Image references must come from this application.");
    }
    if (
      imageUrl.pathname !== "/media" &&
      imageUrl.pathname !== "/media/"
    ) {
      throw new BadRequestException("Image references must come from the image upload service.");
    }
    const keys = imageUrl.searchParams.getAll("key");
    if (
      keys.length !== 1 ||
      imageUrl.searchParams.size !== 1 ||
      imageUrl.hash
    ) {
      throw new BadRequestException("The stored image reference is invalid.");
    }

    const key = keys[0];
    if (!this.isObjectKey(key)) {
      throw new BadRequestException("The stored image reference is invalid.");
    }
    return key;
  }

  publicImageReference(reference: string): string {
    return this.isObjectKey(reference)
      ? `/media?key=${encodeURIComponent(reference)}`
      : reference;
  }

  async upload(
    key: string,
    body: Buffer | Readable,
    contentType: string,
    contentLength?: number,
  ): Promise<void> {
    this.assertObjectKey(key);
    try {
      await this.client.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: body,
          ContentType: contentType,
          ...(contentLength === undefined ? {} : { ContentLength: contentLength }),
          CacheControl: "public, max-age=31536000, immutable",
        }),
      );
    } catch (error) {
      throw new ServiceUnavailableException(
        "Image storage could not save the image.",
        { cause: error },
      );
    }
  }

  async hasObject(key: string): Promise<boolean> {
    this.assertObjectKey(key);
    try {
      await this.client.send(
        new HeadObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      return true;
    } catch (error) {
      if (isMissingObject(error)) return false;
      throw new ServiceUnavailableException(
        "Image storage could not verify the image.",
        { cause: error },
      );
    }
  }

  async getObject(key: string): Promise<StoredImage> {
    this.assertObjectKey(key);
    try {
      const result = await this.client.send(
        new GetObjectCommand({ Bucket: this.bucket, Key: key }),
      );
      if (!(result.Body instanceof Readable)) {
        throw new ServiceUnavailableException(
          "Image storage returned an unreadable image stream.",
        );
      }
      return {
        body: result.Body,
        contentType: result.ContentType ?? "application/octet-stream",
        contentLength: result.ContentLength,
        etag: result.ETag,
      };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      if (isMissingObject(error)) {
        throw new NotFoundException("Image not found.");
      }
      throw new ServiceUnavailableException(
        "Image storage could not retrieve the image.",
        { cause: error },
      );
    }
  }

  async deleteObject(key: string): Promise<void> {
    this.assertObjectKey(key);
    try {
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
      );
    } catch (error) {
      throw new ServiceUnavailableException(
        "Image storage could not delete the image.",
        { cause: error },
      );
    }
  }

  private async ensureBucket(): Promise<void> {
    let lastError: unknown;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      try {
        await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
        return;
      } catch (error) {
        if (isMissingBucket(error)) {
          try {
            await this.client.send(
              new CreateBucketCommand({ Bucket: this.bucket }),
            );
            await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
            return;
          } catch (createError) {
            if (isBucketAlreadyCreated(createError)) {
              await this.client.send(
                new HeadBucketCommand({ Bucket: this.bucket }),
              );
              return;
            }
            if (!isRetryable(createError) || attempt === 9) {
              throw new Error(
                `Unable to create RustFS bucket "${this.bucket}".`,
                { cause: createError },
              );
            }
            lastError = createError;
          }
        } else if (isRetryable(error) && attempt < 9) {
          lastError = error;
        } else {
          throw new Error(
            `Unable to access RustFS bucket "${this.bucket}".`,
            { cause: error },
          );
        }
        await delay(500 * (attempt + 1));
      }
    }
    throw new Error(`RustFS did not become ready for bucket "${this.bucket}".`, {
      cause: lastError,
    });
  }

  private normalizePrefix(prefix: string): string {
    const normalized = prefix.trim().replace(/^\/+|\/+$/g, "");
    if (
      normalized &&
      (!/^[a-zA-Z0-9._/-]+$/.test(normalized) ||
        normalized.split("/").some((segment) => !segment || segment === "." || segment === ".."))
    ) {
      throw new Error("RUSTFS_OBJECT_PREFIX contains an invalid path.");
    }
    return normalized;
  }

  private withPrefix(key: string): string {
    return this.prefix ? `${this.prefix}/${key}` : key;
  }

  private withoutPrefix(key: string): string {
    if (!this.prefix) return key;
    const prefix = `${this.prefix}/`;
    return key.startsWith(prefix) ? key.slice(prefix.length) : "";
  }

  private assertObjectKey(key: string): void {
    if (!this.isObjectKey(key)) {
      throw new BadRequestException("The image object key is invalid.");
    }
  }
}
