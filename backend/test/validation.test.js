const {
  createValidationConfigFromEnv,
  mockValidateEmail,
  withTimeout,
} = require("../dist/jobs/validation");

describe("Async email validation", () => {
  test("marks emails containing @ as valid", async () => {
    const result = await mockValidateEmail("john@example.com", {
      delayMs: 1,
      random: () => 0.99,
    });

    expect(result.valid).toBe(true);
  });

  test("marks emails without @ as invalid", async () => {
    const result = await mockValidateEmail("invalid-email", {
      delayMs: 1,
      random: () => 0.99,
    });

    expect(result.valid).toBe(false);
  });
});

describe("Error handling", () => {
  test("withTimeout rejects when validation hangs", async () => {
    await expect(
      withTimeout(
        mockValidateEmail("hang@example.com", {
          hangPct: 100,
          random: () => 0,
        }),
        10
      )
    ).rejects.toThrow("Validation timed out");
  });

  test("throws on invalid timeout env config", () => {
    expect(() =>
      createValidationConfigFromEnv({
        VALIDATION_TIMEOUT_MS: "-1",
        VALIDATION_HANG_PCT: "0",
        STATUS_FLUSH_EVERY_N: "1000",
      })
    ).toThrow("VALIDATION_TIMEOUT_MS must be a positive integer");
  });
});
