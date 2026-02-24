import { Worker } from "bullmq";
import "dotenv/config";
import { redisConnectionOpts } from "./connections/redis";
import { UPLOAD_QUEUE_NAME } from "./queues/uploadQueue";
import { setError, setStatus } from "./uploadStatusService";

type UploadJobData = { uploadId: string; filePath: string };

const worker = new Worker<UploadJobData>(
  UPLOAD_QUEUE_NAME,
  async (job) => {
    const { uploadId } = job.data;

    try {
      await setStatus(uploadId, "processing");

      
    } catch (err: any) {
      await setError(uploadId, err?.message ?? String(err));
      throw err; 
    }
  },
  {
    connection: redisConnectionOpts,
  }
);

worker.on("completed", (job) => {
  console.log(`Job completed: ${job.id}`);
});

worker.on("failed", (job, err) => {
  console.error(`Job failed: ${job?.id}`, err);
});

process.on("SIGINT", async () => {
  await worker.close();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await worker.close();
  process.exit(0);
});