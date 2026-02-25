import { Worker } from "bullmq";
import { redisConnectionOpts } from "./connections/redis";
import { processUploadJob } from "./jobs/processUploadJob";
import { UPLOAD_QUEUE_NAME } from "./queues/uploadQueue";
import { setError, setStatus } from "./uploadStatusService";

type UploadJobData = { uploadId: string; filePath: string };

const worker = new Worker<UploadJobData>(
  UPLOAD_QUEUE_NAME,
  async (job) => {
    const { uploadId, filePath } = job.data;

    try { 
      await setStatus(uploadId, "processing"); 
      await processUploadJob({ uploadId, filePath }); 
      await setStatus(uploadId, "done"); 
    } catch (err: any) { 
      await setError(uploadId, err?.message ?? String(err)); 
      throw err; // Re-throw so BullMQ marks the job as failed.
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
