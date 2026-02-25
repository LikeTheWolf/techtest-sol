import { parse } from "fast-csv";
import fs from "node:fs";
import pLimit from "p-limit";
import { incrCounts, pushFailureDetail, setProgressPercent } from "../uploadStatusService";

type UploadJobData = { uploadId: string; filePath: string };
type ValidationResult = { valid: boolean };

const VALIDATION_CONCURRENCY = 5;

const VALIDATION_TIMEOUT_MS = Number(process.env.VALIDATION_TIMEOUT_MS ?? "1000");
if (!Number.isInteger(VALIDATION_TIMEOUT_MS) || VALIDATION_TIMEOUT_MS <= 0) {
  throw new Error(`VALIDATION_TIMEOUT_MS must be a positive integer. Got: ${process.env.VALIDATION_TIMEOUT_MS}`);
}

const VALIDATION_HANG_PCT = Number(process.env.VALIDATION_HANG_PCT ?? "0"); // 0..100
if (!Number.isFinite(VALIDATION_HANG_PCT) || VALIDATION_HANG_PCT < 0 || VALIDATION_HANG_PCT > 100) {
  throw new Error(`VALIDATION_HANG_PCT must be 0..100. Got: ${process.env.VALIDATION_HANG_PCT}`);
}

const STATUS_FLUSH_EVERY_N = Number(process.env.STATUS_FLUSH_EVERY_N ?? "1000");
if (!Number.isInteger(STATUS_FLUSH_EVERY_N) || STATUS_FLUSH_EVERY_N <= 0) {
  throw new Error(`STATUS_FLUSH_EVERY_N must be a positive integer. Got: ${process.env.STATUS_FLUSH_EVERY_N}`);
}

// returns [promiseToAwait, resolveFunction]
function deferred<T = void>(): [Promise<T>, (value: T) => void] {
  let resolveFn: (value: T) => void = () => {
    throw new Error("Deferred resolve called before initialization");
  };
  const promise = new Promise<T>((resolve) => {
    resolveFn = resolve;
  });
  return [promise, resolveFn];
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Validation timed out")), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

async function mockValidateEmail(email: string): Promise<ValidationResult> {
  if (Math.random() * 100 < VALIDATION_HANG_PCT) {
    return new Promise<ValidationResult>(() => {
      // intentional hang
    });
  }

  // normally resolve after delay
  return new Promise<ValidationResult>((resolve) => {
    setTimeout(() => resolve({ valid: email.includes("@") }), 100);
  });
}

export async function processUploadJob(data: UploadJobData): Promise<void> {
  const { uploadId, filePath } = data;

  // file size for progress
  const { size: fileSizeBytes } = await fs.promises.stat(filePath);

  let bytesRead = 0;
  let lastPct = -1;

  let deltaTotal = 0;
  let deltaProcessed = 0;
  let deltaFailed = 0;

  async function flushDeltas(force = false) {
    const sum = deltaTotal + deltaProcessed + deltaFailed;
    if (!force && sum < STATUS_FLUSH_EVERY_N) return;

    const t = deltaTotal;
    const p = deltaProcessed;
    const f = deltaFailed;

    deltaTotal = 0;
    deltaProcessed = 0;
    deltaFailed = 0;

    await incrCounts(uploadId, { total: t, processed: p, failed: f });
  }

  let scheduled = 0;
  let finished = 0;
  let streamEnded = false;

  const [donePromise, resolveDone] = deferred<void>();
  let doneResolved = false;

  function checkDone() {
    if (doneResolved) return;
    if (streamEnded && finished === scheduled) {
      doneResolved = true;
      resolveDone();
    }
  }

  const limit = pLimit(VALIDATION_CONCURRENCY);

  const readStream = fs.createReadStream(filePath);

  readStream.on("data", (chunk) => {
    bytesRead += chunk.length;
    const pct = fileSizeBytes === 0 ? 100 : Math.floor((bytesRead / fileSizeBytes) * 100);
    const bounded = Math.max(0, Math.min(100, pct));
    if (bounded !== lastPct) {
      lastPct = bounded;
      void setProgressPercent(uploadId, bounded);
    }
  });

  const parser = parse({ headers: true, ignoreEmpty: true, trim: true });

  const endPromise = new Promise<void>((resolve, reject) => {
    parser.on("end", () => resolve());
    parser.on("error", reject);
    readStream.on("error", reject);
  });

  parser.on("data", (row: any) => {
    const name = String(row?.name ?? "").trim();
    const email = String(row?.email ?? "").trim();

    deltaTotal += 1;
    void flushDeltas(false); 

    scheduled += 1;

    void limit(async () => {
      if (!email) {
        deltaFailed += 1;
        await pushFailureDetail(uploadId, { name, email, error: "Missing email" });
        return;
      }

      try {
        const result = await withTimeout(mockValidateEmail(email), VALIDATION_TIMEOUT_MS);

        if (result.valid) {
          deltaProcessed += 1;
        } else {
          deltaFailed += 1;
          await pushFailureDetail(uploadId, { name, email, error: "Invalid email format" });
        }
      } catch (e: any) {
        deltaFailed += 1;
        await pushFailureDetail(uploadId, { name, email, error: e?.message ?? "Validation service error" });
      }
    }).finally(() => {
      finished += 1;
      void flushDeltas(false);
      checkDone();
    });
  });

  readStream.pipe(parser);

  await endPromise;
  streamEnded = true;
  checkDone();

  await donePromise;

  await flushDeltas(true);
  await setProgressPercent(uploadId, 100);
}