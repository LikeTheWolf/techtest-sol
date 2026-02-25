import { randomUUID } from 'crypto';
import express from 'express';
import http from 'http';
import multer from 'multer';
import { uploadRateLimiter } from "./middleware/uploadRateLimit";
import { uploadQueue } from "./queues/uploadQueue";
import { createUpload, getUpload } from './uploadStatusService';

const app = express();
let server = http.createServer(app);

const SERVER_PORT = process.env.PORT;
const upload = multer({
  dest: process.env.RUNTIME_UPLOAD_DIR ?? "runtime/uploads",
});


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
app.post("/api/upload", uploadRateLimiter, upload.single("file"), async (req, res) => {
  const file = req.file; 
  if (!file) {
    return res.status(400).json({ error: "No file uploaded (form-data key must be 'file')" });
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
});

app.get("/api/status/:uploadId", async (req, res) => { 
  const record = await getUpload(req.params.uploadId); 

  if (!record) { 
    return res.status(404).json({ error: "Upload not found." }); 
  } 
  return res.json(record); 
}); 
