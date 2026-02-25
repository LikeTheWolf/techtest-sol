import { randomUUID } from 'crypto';
import express, { NextFunction, Request, Response } from 'express';
import http from 'http';
import multer from 'multer';
import fs from "node:fs";
import { uploadRateLimiter } from "./middleware/uploadRateLimit";
import { uploadQueue } from "./queues/uploadQueue";
import { createUpload, getUpload } from './uploadStatusService';

const app = express();
let server = http.createServer(app);

const SERVER_PORT = process.env.PORT;
const upload = multer({
  dest: process.env.RUNTIME_UPLOAD_DIR ?? "runtime/uploads",
});

const acceptedCsvMimeTypes = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "text/plain",
]);

function isCsvFile(file: Express.Multer.File): boolean {
  return (
    file.originalname.toLowerCase().endsWith(".csv") ||
    acceptedCsvMimeTypes.has((file.mimetype || "").toLowerCase())
  );
}

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*'); // Or restrict in production
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  next();
});

app.get('/heartbeat', (req, res) => {
  res.send('OK');
});

server.listen(Number(SERVER_PORT), '0.0.0.0', async () => {  // Listen on all network interfaces
  console.log(`Server is running on port:${SERVER_PORT}`);

  process.on("uncaughtException", (innerErr: Error) => {
    console.error(`UNCAUGHT EXCEPTION AT SYSTEM LEVEL: ${innerErr.message}`);
    console.warn(`Stack Trace: ${innerErr.stack}`);
  });

  process.on("unhandledRejection", (reason: any) => {
    console.warn(`Unhandled Rejection at: Promise, reason: ${reason}`);
  });
});

//upload file
const uploadHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
  const file = req.file; 
  if (!file) {
    return res.status(400).json({ error: "No file uploaded (form-data key must be 'file')" });
  }
  if (!isCsvFile(file)) {
    await fs.promises.unlink(file.path).catch(() => {});
    return res.status(400).json({ error: "Invalid file type. Please upload a .csv file." });
  }

  const uploadId = randomUUID();

  await createUpload({ 
    uploadId, 
    filePath: req.file!.path,
    originalName: req.file!.originalname, 
  });

  await uploadQueue.add(
    "process-upload",
    { uploadId, filePath: req.file!.path },
    { removeOnComplete: true, removeOnFail: false }
  );

  return res.json({
    uploadId, 
    message: "File uploaded successfully. Processing started.",
  });
  } catch (err) {
    return next(err);
  }
};

app.post("/api/upload", uploadRateLimiter, upload.single("file"), uploadHandler);
app.post("/upload", uploadRateLimiter, upload.single("file"), uploadHandler);

const statusHandler = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const record = await getUpload(req.params.uploadId); 

    if (!record) { 
      return res.status(404).json({ error: "Upload not found." }); 
    } 
    return res.json(record); 
  } catch (err) {
    return next(err);
  }
};

app.get("/api/status/:uploadId", statusHandler);
app.get("/status/:uploadId", statusHandler);

app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (res.headersSent) {
    return next(err);
  }
  const message = err instanceof Error ? err.message : "Unexpected server error";
  return res.status(500).json({ error: message });
});
