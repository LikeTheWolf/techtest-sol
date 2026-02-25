function createMultiMock() {
  const chain = {
    hset: jest.fn().mockReturnThis(),
    hincrby: jest.fn().mockReturnThis(),
    lpush: jest.fn().mockReturnThis(),
    ltrim: jest.fn().mockReturnThis(),
    expire: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([]),
  };
  return chain;
}

describe("uploadStatusService", () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  test("getUpload returns parsed progress and failure details", async () => {
    const redis = {
      hgetall: jest.fn().mockResolvedValue({
        uploadId: "abc",
        status: "processing",
        filePath: "runtime/uploads/file.csv",
        originalName: "file.csv",
        createdAt: "1",
        progressPercent: "70",
        processedRecords: "9",
        failedRecords: "1",
        totalRecords: "10",
      }),
      lrange: jest
        .fn()
        .mockResolvedValue([
          JSON.stringify({ name: "Jane", email: "invalid-email", error: "Invalid email format" }),
          "not-json",
        ]),
    };

    jest.doMock("../dist/connections/redis", () => ({ redis }));
    const { getUpload } = require("../dist/uploadStatusService");

    const record = await getUpload("abc");

    expect(record).toEqual(
      expect.objectContaining({
        uploadId: "abc",
        progress: "70%",
        progressPercent: 70,
        totalRecords: 10,
        processedRecords: 9,
        failedRecords: 1,
      })
    );
    expect(record.details).toEqual([
      { name: "Jane", email: "invalid-email", error: "Invalid email format" },
    ]);
  });

  test("pushFailureDetail trims to cap and sets ttl", async () => {
    const chain = createMultiMock();
    const redis = {
      multi: jest.fn().mockReturnValue(chain),
    };

    jest.doMock("../dist/connections/redis", () => ({ redis }));
    const { pushFailureDetail } = require("../dist/uploadStatusService");

    await pushFailureDetail("u-1", { name: "A", email: "a", error: "e" });

    expect(redis.multi).toHaveBeenCalled();
    expect(chain.lpush).toHaveBeenCalledWith(
      "upload:u-1:failures",
      JSON.stringify({ name: "A", email: "a", error: "e" })
    );
    expect(chain.ltrim).toHaveBeenCalledWith("upload:u-1:failures", 0, 999);
    expect(chain.expire).toHaveBeenCalledWith("upload:u-1:failures", expect.any(Number));
    expect(chain.exec).toHaveBeenCalled();
  });
});
