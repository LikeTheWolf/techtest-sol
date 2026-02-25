const express = require("express");
const http = require("node:http");

const { uploadRateLimiter } = require("../dist/middleware/uploadRateLimit");

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
}

function close(server) {
  return new Promise((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve()))
  );
}

describe("uploadRateLimiter", () => {
  test("limits upload requests to 10 per minute", async () => {
    const app = express();
    app.post("/upload", uploadRateLimiter, (_req, res) => {
      res.status(200).json({ ok: true });
    });

    const server = http.createServer(app);
    await listen(server);

    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;

    for (let i = 0; i < 10; i += 1) {
      const response = await fetch(`${baseUrl}/upload`, { method: "POST" });
      expect(response.status).toBe(200);
    }

    const response = await fetch(`${baseUrl}/upload`, { method: "POST" });
    expect(response.status).toBe(429);
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        error: "Too many upload requests. Please try again later.",
      })
    );

    await close(server);
  });
});
