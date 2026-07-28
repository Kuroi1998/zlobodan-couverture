import "server-only";
import fs from "node:fs";
import path from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getPrivateStorageConfig } from "@/config/env";

export interface PrivateObject {
  bytes: Buffer;
  contentType: string | undefined;
}

export interface PrivateObjectMetadata {
  storageKey: string;
  lastModified: Date;
}

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  const config = getPrivateStorageConfig();
  if (config.driver !== "s3") {
    throw new Error("Stockage S3 non configuré.");
  }
  if (!s3Client) {
    s3Client = new S3Client({
      endpoint: config.endpoint,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return s3Client;
}

function resolveLocalPath(storageKey: string): string {
  const config = getPrivateStorageConfig();
  if (config.driver !== "local") throw new Error("Stockage local non configuré.");
  const root = path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    config.directory
  );
  const target = path.resolve(
    /* turbopackIgnore: true */ root,
    ...storageKey.split("/")
  );
  if (!target.startsWith(`${root}${path.sep}`)) {
    throw new Error("Clé de stockage invalide.");
  }
  return target;
}

export async function putPrivateObject(
  storageKey: string,
  bytes: Buffer,
  contentType: string
): Promise<void> {
  const config = getPrivateStorageConfig();
  if (config.driver === "local") {
    const target = resolveLocalPath(storageKey);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.writeFile(target, bytes, { mode: 0o640, flag: "wx" });
    return;
  }

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: storageKey,
      Body: bytes,
      ContentType: contentType,
      ServerSideEncryption: "AES256",
    })
  );
}

export async function deletePrivateObject(storageKey: string): Promise<void> {
  const config = getPrivateStorageConfig();
  if (config.driver === "local") {
    const target = resolveLocalPath(storageKey);
    await fs.promises.unlink(target).catch((error: NodeJS.ErrnoException) => {
      if (error.code !== "ENOENT") throw error;
    });
    return;
  }

  await getS3Client().send(
    new DeleteObjectCommand({ Bucket: config.bucket, Key: storageKey })
  );
}

export async function readPrivateObject(storageKey: string): Promise<PrivateObject> {
  const config = getPrivateStorageConfig();
  if (config.driver === "local") {
    return { bytes: await fs.promises.readFile(resolveLocalPath(storageKey)), contentType: undefined };
  }

  const response = await getS3Client().send(
    new GetObjectCommand({ Bucket: config.bucket, Key: storageKey })
  );
  if (!response.Body) throw new Error("Objet de stockage introuvable.");
  return {
    bytes: Buffer.from(await response.Body.transformToByteArray()),
    contentType: response.ContentType,
  };
}

async function listLocalObjects(
  directory: string,
  prefix = ""
): Promise<PrivateObjectMetadata[]> {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    }
  );
  const objects: PrivateObjectMetadata[] = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
    const absolutePath = path.join(
      /* turbopackIgnore: true */ directory,
      entry.name
    );
    if (entry.isDirectory()) {
      objects.push(...(await listLocalObjects(absolutePath, relativePath)));
    } else if (entry.isFile()) {
      const stats = await fs.promises.stat(absolutePath);
      objects.push({ storageKey: relativePath, lastModified: stats.mtime });
    }
  }

  return objects;
}

export async function listPrivateObjects(
  prefix: string
): Promise<PrivateObjectMetadata[]> {
  const config = getPrivateStorageConfig();
  if (config.driver === "local") {
    const prefixRoot = resolveLocalPath(`${prefix}/.inventory`).replace(
      `${path.sep}.inventory`,
      ""
    );
    return listLocalObjects(prefixRoot, prefix);
  }

  const objects: PrivateObjectMetadata[] = [];
  let continuationToken: string | undefined;
  do {
    const response = await getS3Client().send(
      new ListObjectsV2Command({
        Bucket: config.bucket,
        Prefix: `${prefix}/`,
        ContinuationToken: continuationToken,
      })
    );
    for (const object of response.Contents ?? []) {
      if (object.Key && object.LastModified) {
        objects.push({
          storageKey: object.Key,
          lastModified: object.LastModified,
        });
      }
    }
    continuationToken = response.IsTruncated
      ? response.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return objects;
}
