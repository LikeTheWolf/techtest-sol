import { parse } from "fast-csv";
import fs from "node:fs";
import pLimit from "p-limit";
import { incrCounts, pushFailureDetail, setProgressPercent } from "../uploadStatusService";
import { logger } from "../logging/logger";
import { parseCsvRow } from "./csvRow";
import {
  createValidationConfigFromEnv,
  mockValidateEmail,
  withTimeout,
} from "./validation";

type UploadJobData = { uploadId: string; filePath: string };

const VALIDATION_CONCURRENCY = 5;

const validationConfig = createValidationConfigFromEnv(process.env);
const VALIDATION_TIMEOUT_MS = validationConfig.timeoutMs;
const VALIDATION_HANG_PCT = validationConfig.hangPct;
const STATUS_FLUSH_EVERY_N = validationConfig.flushEveryN;

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

export async function processUploadJob(data: UploadJobData): Promise<void> {
  const { uploadId, filePath } = data;

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

  async function updateProgress() {
    const rawPct =
      streamEnded && scheduled === 0
        ? 100
        : Math.floor((finished / Math.max(scheduled, 1)) * 100);

    const boundedPct = Math.max(0, Math.min(100, rawPct));
    const nextPct = Math.max(lastPct, boundedPct);

    if (nextPct === lastPct) return;

    lastPct = nextPct;
    await setProgressPercent(uploadId, nextPct);
  }

  const readStream = fs.createReadStream(filePath);

  const parser = parse({ headers: true, ignoreEmpty: true, trim: true });

  const endPromise = new Promise<void>((resolve, reject) => {
    parser.on("end", () => resolve());
    parser.on("error", reject);
    readStream.on("error", reject);
  });

  parser.on("data", (row: any) => {
    const { name, email } = parseCsvRow(row);

    deltaTotal += 1;
    void flushDeltas(false); 

    scheduled += 1;
    void updateProgress();

    void limit(async () => {
      logger.info("Validation attempt", { uploadId, name, email });

      if (!email) {
        deltaFailed += 1;
        await pushFailureDetail(uploadId, { name, email, error: "Missing email" });
        logger.warn("Validation failed", {
          uploadId,
          name,
          email,
          error: "Missing email",
        });
        return;
      }

      try {
        const result = await withTimeout(
          mockValidateEmail(email, { hangPct: VALIDATION_HANG_PCT }),
          VALIDATION_TIMEOUT_MS
        );

        if (result.valid) {
          deltaProcessed += 1;
          logger.info("Validation succeeded", { uploadId, name, email });
        } else {
          deltaFailed += 1;
          await pushFailureDetail(uploadId, { name, email, error: "Invalid email format" });
          logger.warn("Validation failed", {
            uploadId,
            name,
            email,
            error: "Invalid email format",
          });
        }
      } catch (e: any) {
        deltaFailed += 1;
        const message = e?.message ?? "Validation service error";
        await pushFailureDetail(uploadId, { name, email, error: message });
        logger.error("Validation error", {
          uploadId,
          name,
          email,
          error: message,
        });
      }
    }).finally(() => {
      finished += 1;
      void flushDeltas(false);
      void updateProgress();
      checkDone();
    });
  });

  readStream.pipe(parser);

  await endPromise;
  streamEnded = true;
  checkDone();

  await donePromise;

  await flushDeltas(true);
  await updateProgress();
}
