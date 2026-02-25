describe("worker processor", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("sets processing and done status when job succeeds", async () => {
    let processor;

    const workerMock = jest.fn().mockImplementation((_name, fn) => {
      processor = fn;
      return {
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };
    });

    const processUploadJob = jest.fn().mockResolvedValue(undefined);
    const setStatus = jest.fn().mockResolvedValue(undefined);
    const setError = jest.fn().mockResolvedValue(undefined);

    jest.doMock("bullmq", () => ({
      Worker: workerMock,
      Queue: jest.fn().mockImplementation(() => ({})),
    }));
    jest.doMock("../dist/jobs/processUploadJob", () => ({ processUploadJob }));
    jest.doMock("../dist/uploadStatusService", () => ({ setStatus, setError }));
    jest.doMock("../dist/connections/redis", () => ({
      redisConnectionOpts: { host: "127.0.0.1", port: 6379 },
    }));
    jest.spyOn(process, "on").mockReturnValue(process);

    require("../dist/worker");

    await processor({ data: { uploadId: "u-1", filePath: "f.csv" } });

    expect(setStatus).toHaveBeenNthCalledWith(1, "u-1", "processing");
    expect(setStatus).toHaveBeenNthCalledWith(2, "u-1", "done");
    expect(setError).not.toHaveBeenCalled();
  });

  test("sets error status and rethrows when job fails", async () => {
    let processor;

    const workerMock = jest.fn().mockImplementation((_name, fn) => {
      processor = fn;
      return {
        on: jest.fn(),
        close: jest.fn().mockResolvedValue(undefined),
      };
    });

    const processUploadJob = jest.fn().mockRejectedValue(new Error("boom"));
    const setStatus = jest.fn().mockResolvedValue(undefined);
    const setError = jest.fn().mockResolvedValue(undefined);

    jest.doMock("bullmq", () => ({
      Worker: workerMock,
      Queue: jest.fn().mockImplementation(() => ({})),
    }));
    jest.doMock("../dist/jobs/processUploadJob", () => ({ processUploadJob }));
    jest.doMock("../dist/uploadStatusService", () => ({ setStatus, setError }));
    jest.doMock("../dist/connections/redis", () => ({
      redisConnectionOpts: { host: "127.0.0.1", port: 6379 },
    }));
    jest.spyOn(process, "on").mockReturnValue(process);

    require("../dist/worker");

    await expect(processor({ data: { uploadId: "u-2", filePath: "f.csv" } })).rejects.toThrow(
      "boom"
    );
    expect(setStatus).toHaveBeenCalledWith("u-2", "processing");
    expect(setError).toHaveBeenCalledWith("u-2", "boom");
  });
});
