const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

function sumDeltas(calls) {
  return calls.reduce(
    (acc, call) => {
      const deltas = call[1] || {};
      acc.total += deltas.total || 0;
      acc.processed += deltas.processed || 0;
      acc.failed += deltas.failed || 0;
      return acc;
    },
    { total: 0, processed: 0, failed: 0 }
  );
}

describe("processUploadJob", () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "upload-job-"));
    jest.resetModules();
    jest.clearAllMocks();
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test("streams CSV and updates counters/progress/details", async () => {
    const filePath = path.join(tmpDir, "users.csv");
    fs.writeFileSync(
      filePath,
      "name,email\nJohn,john@example.com\nJane,invalid-email\nNoEmail,\n",
      "utf8"
    );

    process.env.VALIDATION_TIMEOUT_MS = "200";
    process.env.VALIDATION_HANG_PCT = "0";
    process.env.STATUS_FLUSH_EVERY_N = "1";

    const incrCounts = jest.fn().mockResolvedValue(undefined);
    const pushFailureDetail = jest.fn().mockResolvedValue(undefined);
    const setProgressPercent = jest.fn().mockResolvedValue(undefined);
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.doMock("../dist/uploadStatusService", () => ({
      incrCounts,
      pushFailureDetail,
      setProgressPercent,
    }));
    jest.doMock("../dist/logging/logger", () => ({ logger }));
    jest.doMock("p-limit", () => () => (fn) => Promise.resolve().then(fn));

    const { processUploadJob } = require("../dist/jobs/processUploadJob");
    await processUploadJob({ uploadId: "u-1", filePath });

    const totals = sumDeltas(incrCounts.mock.calls);
    expect(totals).toEqual({ total: 3, processed: 1, failed: 2 });

    expect(pushFailureDetail).toHaveBeenCalledTimes(2);
    expect(pushFailureDetail).toHaveBeenCalledWith(
      "u-1",
      expect.objectContaining({ error: "Invalid email format" })
    );
    expect(pushFailureDetail).toHaveBeenCalledWith(
      "u-1",
      expect.objectContaining({ error: "Missing email" })
    );

    expect(setProgressPercent).toHaveBeenCalled();
    expect(setProgressPercent).toHaveBeenLastCalledWith("u-1", 100);

    expect(logger.info).toHaveBeenCalledWith(
      "Validation attempt",
      expect.objectContaining({ uploadId: "u-1" })
    );
  });

  test("records timeout failures from validation", async () => {
    const filePath = path.join(tmpDir, "timeout.csv");
    fs.writeFileSync(filePath, "name,email\nTess,tess@example.com\n", "utf8");

    process.env.VALIDATION_TIMEOUT_MS = "10";
    process.env.VALIDATION_HANG_PCT = "100";
    process.env.STATUS_FLUSH_EVERY_N = "1";

    const incrCounts = jest.fn().mockResolvedValue(undefined);
    const pushFailureDetail = jest.fn().mockResolvedValue(undefined);
    const setProgressPercent = jest.fn().mockResolvedValue(undefined);
    const logger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    jest.doMock("../dist/uploadStatusService", () => ({
      incrCounts,
      pushFailureDetail,
      setProgressPercent,
    }));
    jest.doMock("../dist/logging/logger", () => ({ logger }));
    jest.doMock("p-limit", () => () => (fn) => Promise.resolve().then(fn));

    const { processUploadJob } = require("../dist/jobs/processUploadJob");
    await processUploadJob({ uploadId: "u-2", filePath });

    expect(pushFailureDetail).toHaveBeenCalledWith(
      "u-2",
      expect.objectContaining({ error: "Validation timed out" })
    );
    const totals = sumDeltas(incrCounts.mock.calls);
    expect(totals.failed).toBe(1);
  });
});
