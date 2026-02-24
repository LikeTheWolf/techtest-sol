import { redis } from "./connections/redis";

export type UploadStatus = "unprocessed" | "processing" | "done" | "error";

export type UploadRecord = {
  uploadId: string;
  status: UploadStatus;
  filePath: string;
  originalName: string;
  createdAt: number;
  processedRecords: number;
  failedRecords: number;
  totalRecords: number;
  errorMessage?: string;
};

const ttlSeconds = 24 * 60 * 60;

const keyFor = (uploadId: string) => `upload:${uploadId}`;

export async function createUpload(params: {
  uploadId: string;
  filePath: string;
  originalName: string;
}): Promise<void> {
  const key = keyFor(params.uploadId);

  await redis.hset(key, {
    uploadId: params.uploadId,
    status: "unprocessed",
    filePath: params.filePath,
    originalName: params.originalName,
    createdAt: String(Date.now()),
    processedRecords: "0",
    failedRecords: "0",
    totalRecords: "0",
  });

  await redis.expire(key, ttlSeconds);
}

export async function getUpload(uploadId: string): Promise<UploadRecord | null> {
  const key = keyFor(uploadId);

  const raw = await redis.hgetall(key);

  if (!raw || Object.keys(raw).length === 0) return null;

  return {
    uploadId: raw.uploadId,
    status: raw.status as UploadStatus,
    filePath: raw.filePath,
    originalName: raw.originalName,
    createdAt: Number(raw.createdAt ?? 0),
    processedRecords: Number(raw.processedRecords ?? 0),
    failedRecords: Number(raw.failedRecords ?? 0),
    totalRecords: Number(raw.totalRecords ?? 0),
    errorMessage: raw.errorMessage || undefined,
  };
}

export async function setStatus(uploadId: string, status: "processing" | "done" | "error") {
  await redis.hset(keyFor(uploadId), { status });
}

export async function setError(uploadId: string, errorMessage: string) {
  await redis.hset(keyFor(uploadId), { status: "error", errorMessage });
}

export async function incrTotalRecords(uploadId: string, delta = 1): Promise<number> {
  if (!Number.isInteger(delta) || delta <= 0) {
    throw new Error(`incrTotalRecords delta must be a positive integer. Got: ${delta}`);
  }
  return redis.hincrby(keyFor(uploadId), "totalRecords", delta);
}

export async function incrProcessedRecords(uploadId: string, delta: number = 1): Promise<number> { // Atomically increment processedRecords.
  if (!Number.isInteger(delta) || delta <= 0) {
    throw new Error(`incrTotalRecords delta must be a positive integer. Got: ${delta}`);
  }
  return redis.hincrby(keyFor(uploadId), "processedRecords", delta);
} 

export async function incrFailedRecords(uploadId: string, delta: number = 1): Promise<number> { // Atomically increment failedRecords.
  if (!Number.isInteger(delta) || delta <= 0) {
    throw new Error(`incrTotalRecords delta must be a positive integer. Got: ${delta}`);
  }
  return redis.hincrby(keyFor(uploadId), "failedRecords", delta);
} 