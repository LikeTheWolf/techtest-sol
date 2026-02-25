export type ValidationResult = { valid: boolean };

export type ValidationConfig = {
  timeoutMs: number;
  hangPct: number;
  flushEveryN: number;
};

export function createValidationConfigFromEnv(
  env: Record<string, string | undefined>
): ValidationConfig {
  const timeoutMs = Number(env.VALIDATION_TIMEOUT_MS ?? "1000");
  if (!Number.isInteger(timeoutMs) || timeoutMs <= 0) {
    throw new Error(`VALIDATION_TIMEOUT_MS must be a positive integer. Got: ${env.VALIDATION_TIMEOUT_MS}`);
  }

  const hangPct = Number(env.VALIDATION_HANG_PCT ?? "0");
  if (!Number.isFinite(hangPct) || hangPct < 0 || hangPct > 100) {
    throw new Error(`VALIDATION_HANG_PCT must be 0..100. Got: ${env.VALIDATION_HANG_PCT}`);
  }

  const flushEveryN = Number(env.STATUS_FLUSH_EVERY_N ?? "1000");
  if (!Number.isInteger(flushEveryN) || flushEveryN <= 0) {
    throw new Error(`STATUS_FLUSH_EVERY_N must be a positive integer. Got: ${env.STATUS_FLUSH_EVERY_N}`);
  }

  return { timeoutMs, hangPct, flushEveryN };
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
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

export async function mockValidateEmail(
  email: string,
  opts?: { hangPct?: number; delayMs?: number; random?: () => number }
): Promise<ValidationResult> {
  const hangPct = opts?.hangPct ?? 0;
  const delayMs = opts?.delayMs ?? 100;
  const random = opts?.random ?? Math.random;

  if (random() * 100 < hangPct) {
    return new Promise<ValidationResult>(() => {
      // intentional hang
    });
  }

  return new Promise<ValidationResult>((resolve) => {
    setTimeout(() => resolve({ valid: email.includes("@") }), delayMs);
  });
}
