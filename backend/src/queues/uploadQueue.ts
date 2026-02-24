import { Queue } from "bullmq";
import { redisConnectionOpts } from "../connections/redis";

export const UPLOAD_QUEUE_NAME = "upload-processing";

export const uploadQueue = new Queue(UPLOAD_QUEUE_NAME, {
  connection: redisConnectionOpts,
});