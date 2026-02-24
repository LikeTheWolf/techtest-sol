import IORedis from "ioredis";

const required = (name: string) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
};

export const redisConnectionOpts = {
  host: required("REDIS_HOST"),
  port: Number(required("REDIS_PORT")),
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB ?? "0"),
};

export const redis = new IORedis(redisConnectionOpts);