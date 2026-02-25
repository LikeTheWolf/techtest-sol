import { redis } from "./connections/redis";

export type UploadStatus = "unprocessed" | "processing" | "done" | "error";

export type UploadRecord = {
  uploadId: string;
  status: UploadStatus;
  filePath: string;
  originalName: string;
  createdAt: number;
  progressPercent: number;
  processedRecords: number;
  failedRecords: number;
  totalRecords: number;
  details: FailureDetail[];
  errorMessage?: string;
};

const ttlSeconds = 24 * 60 * 60;

const keyFor = (uploadId: string) => `upload:${uploadId}`;
const failuresKeyFor = (uploadId: string) => `upload:${uploadId}:failures`;

export type FailureDetail = {
  name: string; 
  email: string; 
  error: string; 
};

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
    progressPercent: "0",
    processedRecords: "0",
    failedRecords: "0",
    totalRecords: "0",
  });

  await redis.expire(key, ttlSeconds);
}

export async function getUpload(uploadId: string): Promise<UploadRecord | null> {
  const key = keyFor(uploadId);
  const listKey = failuresKeyFor(uploadId);

  const [raw, failureEntries] = await Promise.all([
    redis.hgetall(key),
    redis.lrange(listKey, 0, 999),
  ]);

  if (!raw || Object.keys(raw).length === 0) return null;

  const details = failureEntries
    .map((entry) => {
      try {
        return JSON.parse(entry) as FailureDetail;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is FailureDetail => entry !== null);

  return {
    uploadId: raw.uploadId,
    status: raw.status as UploadStatus,
    filePath: raw.filePath,
    originalName: raw.originalName,
    createdAt: Number(raw.createdAt ?? 0),
    progressPercent: Number(raw.progressPercent ?? 0),
    processedRecords: Number(raw.processedRecords ?? 0),
    failedRecords: Number(raw.failedRecords ?? 0),
    totalRecords: Number(raw.totalRecords ?? 0),
    details,
    errorMessage: raw.errorMessage || undefined,
  };
}

export async function setStatus(uploadId: string, status: "processing" | "done" | "error") {
  await redis.hset(keyFor(uploadId), { status });
}

export async function setError(uploadId: string, errorMessage: string) {
  await redis.hset(keyFor(uploadId), { status: "error", errorMessage });
}

function assertPositiveInt(name: string, n: number) {
  if (!Number.isInteger(n) || n < 0) throw new Error(`${name} must be an integer >= 0. Got: ${n}`);
}

export async function incrCounts(
  uploadId: string,
  deltas: { total?: number; processed?: number; failed?: number }
): Promise<void> {
  const total = deltas.total ?? 0;
  const processed = deltas.processed ?? 0;
  const failed = deltas.failed ?? 0;

  assertPositiveInt("total delta", total);
  assertPositiveInt("processed delta", processed);
  assertPositiveInt("failed delta", failed);

  const key = keyFor(uploadId);

  const tx = redis.multi();
  if (total) tx.hincrby(key, "totalRecords", total);
  if (processed) tx.hincrby(key, "processedRecords", processed);
  if (failed) tx.hincrby(key, "failedRecords", failed);
  await tx.exec();
}

export async function setProgressPercent( 
  uploadId: string,
  progressPercent: number 
): Promise<void> {
  if (!Number.isInteger(progressPercent) || progressPercent < 0 || progressPercent > 100) { 
    throw new Error(`progressPct must be integer 0..100, got ${progressPercent}`); 
  }
  await redis.hset(keyFor(uploadId), { progressPercent: String(progressPercent) });
}

export async function pushFailureDetail( 
  uploadId: string,
  detail: FailureDetail 
): Promise<void> {
  const listKey = failuresKeyFor(uploadId); 
  const json = JSON.stringify(detail); 
  await redis.multi() 
    .lpush(listKey, json) 
    .ltrim(listKey, 0, 999) 
    .expire(listKey, ttlSeconds)
    .exec(); 
}
