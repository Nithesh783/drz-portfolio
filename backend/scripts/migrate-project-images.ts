import { createReadStream } from "node:fs";
import { open, realpath, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { createPrismaAdapter } from "../src/prisma/prisma-adapter";
import { PrismaClient } from "../src/generated/prisma/client";
import {
  StorageService,
  type SupportedImageExtension,
} from "../src/storage/storage.service";
import { config } from "dotenv";

config({ path: resolve(__dirname, "../../.env") });

type LocalImageSource = {
  path: string;
  identity: string;
  extension: SupportedImageExtension;
  contentType: string;
  size: number;
};

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });
const storage = new StorageService();

function isLoopbackHostname(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
}

function getReferenceUrl(reference: string): URL {
  let url: URL;
  try {
    url = new URL(reference, "http://portfolio.local");
  } catch {
    throw new Error(`Unsupported image reference: ${reference}`);
  }

  if (
    url.origin !== "http://portfolio.local" &&
    !isLoopbackHostname(url.hostname) &&
    url.origin !== (process.env.PUBLIC_API_URL ? new URL(process.env.PUBLIC_API_URL).origin : null)
  ) {
    throw new Error(`Image reference is not from this application: ${reference}`);
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(`Image reference contains unsupported URL components: ${reference}`);
  }
  return url;
}

function getImageExtension(header: Buffer): SupportedImageExtension | null {
  if (
    header.length >= 8 &&
    header.subarray(0, 8).equals(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    )
  ) {
    return "png";
  }
  if (
    header.length >= 3 &&
    header[0] === 0xff &&
    header[1] === 0xd8 &&
    header[2] === 0xff
  ) {
    return "jpg";
  }
  if (
    header.length >= 12 &&
    header.toString("ascii", 0, 4) === "RIFF" &&
    header.toString("ascii", 8, 12) === "WEBP"
  ) {
    return "webp";
  }
  return null;
}

function isInsideDirectory(directory: string, filePath: string): boolean {
  const pathFromDirectory = relative(directory, filePath);
  return Boolean(pathFromDirectory) &&
    pathFromDirectory !== ".." &&
    !pathFromDirectory.startsWith(`..${sep}`) &&
    !isAbsolute(pathFromDirectory);
}

function isMissingPath(error: unknown): boolean {
  return (
    error instanceof Error &&
    "code" in error &&
    (error.code === "ENOENT" || error.code === "ENOTDIR")
  );
}

function getLegacyUploadDirectories(): string[] {
  const configuredDirectories =
    process.env.LEGACY_UPLOADS_DIRECTORIES ??
    process.env.LEGACY_UPLOADS_DIRECTORY ??
    process.env.UPLOADS_DIRECTORY ??
    "uploads";
  return configuredDirectories
    .split(",")
    .map((directory) => resolve(directory.trim()))
    .filter(Boolean);
}

function getLegacyAssetsDirectory(): string {
  return resolve(
    process.env.LEGACY_PUBLIC_ASSETS_DIRECTORY ??
      process.env.PUBLIC_ASSETS_DIRECTORY ??
      "../frontend/public/assets",
  );
}

async function getLocalSource(
  reference: string,
): Promise<LocalImageSource> {
  const url = getReferenceUrl(reference);
  let sourceIdentity: string;
  let filePath: string;
  let sourceRoot: string;

  if (url.pathname.startsWith("/uploads/")) {
    const filename = decodeURIComponent(url.pathname.slice("/uploads/".length));
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(?:jpg|png|webp)$/i.test(filename)) {
      throw new Error(`Unsupported legacy upload path: ${reference}`);
    }
    sourceIdentity = `uploads/${filename.toLowerCase()}`;
    const directories = getLegacyUploadDirectories();
    const matches = directories.map((directory) => ({
      directory,
      path: resolve(directory, filename),
    }));
    let found: { directory: string; path: string } | undefined;
    for (const candidate of matches) {
      try {
        const realDirectory = await realpath(candidate.directory);
        const realFile = await realpath(candidate.path);
        if (!isInsideDirectory(realDirectory, realFile)) {
          throw new Error(
            `Legacy upload path escapes its configured directory: ${reference}`,
          );
        }
        found = { directory: realDirectory, path: realFile };
        break;
      } catch (error) {
        if (isMissingPath(error)) continue;
        throw error;
      }
    }
    if (!found) {
      throw new Error(
        `Missing source file for ${reference}; searched ${directories.join(", ")}.`,
      );
    }
    sourceRoot = found.directory;
    filePath = found.path;
  } else if (url.pathname.startsWith("/assets/")) {
    const relativeAssetPath = decodeURIComponent(
      url.pathname.slice("/assets/".length),
    );
    if (
      !relativeAssetPath ||
      relativeAssetPath.split(/[\\/]/).some((part) => part === "." || part === "..") ||
      isAbsolute(relativeAssetPath) ||
      !/\.(?:jpe?g|png|webp)$/i.test(relativeAssetPath)
    ) {
      throw new Error(`Unsupported legacy asset path: ${reference}`);
    }
    sourceRoot = await realpath(getLegacyAssetsDirectory());
    filePath = await realpath(resolve(sourceRoot, relativeAssetPath));
    if (!isInsideDirectory(sourceRoot, filePath)) {
      throw new Error(`Legacy asset path escapes the public assets directory: ${reference}`);
    }
    sourceIdentity = `assets/${relativeAssetPath}`;
  } else {
    throw new Error(`Unsupported image reference for migration: ${reference}`);
  }

  const fileStat = await stat(filePath);
  if (!fileStat.isFile() || fileStat.size === 0) {
    throw new Error(`Image source is not a non-empty file: ${reference}`);
  }

  const handle = await open(filePath, "r");
  const header = Buffer.alloc(12);
  let bytesRead: number;
  try {
    ({ bytesRead } = await handle.read(header, 0, header.length, 0));
  } finally {
    await handle.close();
  }
  const extension = getImageExtension(header.subarray(0, bytesRead));
  if (!extension) {
    throw new Error(`Image source has an unsupported file format: ${reference}`);
  }

  return {
    path: filePath,
    identity: sourceIdentity,
    extension,
    contentType:
      extension === "jpg"
        ? "image/jpeg"
        : extension === "png"
          ? "image/png"
          : "image/webp",
    size: fileStat.size,
  };
}

async function mapWithConcurrency<T>(
  values: T[],
  concurrency: number,
  callback: (value: T) => Promise<void>,
): Promise<void> {
  let nextIndex = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, values.length) }, async () => {
      while (nextIndex < values.length) {
        const value = values[nextIndex];
        nextIndex += 1;
        await callback(value);
      }
    }),
  );
}

async function main(): Promise<void> {
  await storage.onModuleInit();
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      projectName: true,
      images: true,
      backgroundImage: true,
    },
  });
  const references = new Set(
    projects.flatMap((project) => [
      ...project.images,
      ...(project.backgroundImage ? [project.backgroundImage] : []),
    ]),
  );
  const migrations = new Map<string, string>();
  const localSources = new Map<string, LocalImageSource>();
  const errors: string[] = [];
  const skippedReferences: string[] = [];
  const skipMissingSources = process.argv.includes("--skip-missing-sources");

  for (const reference of references) {
    if (storage.isPreservedStaticImage(reference)) continue;
    if (storage.isObjectKey(reference)) {
      if (!(await storage.hasObject(reference))) {
        errors.push(`RustFS object is missing for existing reference: ${reference}`);
      }
      migrations.set(reference, reference);
      continue;
    }
    try {
      const source = await getLocalSource(reference);
      localSources.set(reference, source);
      migrations.set(
        reference,
        storage.createMigratedProjectImageKey(
          source.identity,
          source.extension,
        ),
      );
    } catch (error) {
      if (skipMissingSources && isMissingPath(error)) {
        skippedReferences.push(reference);
        continue;
      }
      errors.push(
        error instanceof Error ? error.message : `Unable to inspect ${reference}.`,
      );
    }
  }

  if (errors.length) {
    throw new Error(
      `Image migration preflight failed; no project records were changed:\n${errors.map((error) => `- ${error}`).join("\n")}`,
    );
  }

  const dryRun = process.argv.includes("--dry-run");
  const migrationObjects = new Map<string, LocalImageSource>();
  for (const [reference, source] of localSources) {
    const key = migrations.get(reference);
    if (key) migrationObjects.set(key, source);
  }

  if (dryRun) {
    console.info(
      `Dry run complete: ${migrationObjects.size} unique object(s) would be uploaded for ${references.size} image reference(s); ${skippedReferences.length} missing source(s) would remain unchanged. No data was changed.`,
    );
    return;
  }

  await mapWithConcurrency([...migrationObjects], 4, async ([key, source]) => {
    if (!(await storage.hasObject(key))) {
      await storage.upload(
        key,
        createReadStream(source.path),
        source.contentType,
        source.size,
      );
    }
    if (!(await storage.hasObject(key))) {
      throw new Error(`RustFS did not confirm migrated object "${key}".`);
    }
  });

  const updates = projects
    .map((project) => ({
      ...project,
      images: project.images.map((image) => migrations.get(image) ?? image),
      backgroundImage: project.backgroundImage
        ? migrations.get(project.backgroundImage) ?? project.backgroundImage
        : null,
    }))
    .filter(
      (project, index) =>
        JSON.stringify(project.images) !== JSON.stringify(projects[index].images) ||
        project.backgroundImage !== projects[index].backgroundImage,
    );

  if (updates.length) {
    await prisma.$transaction(async (transaction) => {
      for (const update of updates) {
        const current = await transaction.project.findUnique({
          where: { id: update.id },
          select: { images: true, backgroundImage: true },
        });
        const original = projects.find((project) => project.id === update.id);
        if (
          !current ||
          !original ||
          JSON.stringify(current.images) !== JSON.stringify(original.images) ||
          current.backgroundImage !== original.backgroundImage
        ) {
          throw new Error(
            `Project "${update.projectName}" changed during image migration; no database changes were committed.`,
          );
        }
        await transaction.project.update({
          where: { id: update.id },
          data: {
            images: update.images,
            backgroundImage: update.backgroundImage,
          },
        });
      }
    });
  }

  console.info(
    `Image migration complete: ${migrationObjects.size} object(s) stored and verified; ${updates.length} project record(s) updated; ${skippedReferences.length} missing source(s) left unchanged. Original files were left untouched.`,
  );
  if (skippedReferences.length) {
    console.warn(
      `Restore or replace these image references in the admin before migrating them: ${skippedReferences.join(", ")}`,
    );
  }
}

main()
  .catch((error: unknown) => {
    console.error(
      error instanceof Error ? error.message : "Project image migration failed.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    storage.onModuleDestroy();
    await prisma.$disconnect();
  });
