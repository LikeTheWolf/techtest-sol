type LogMeta = Record<string, unknown>;

type LoggerLike = {
  info: (message: string, meta?: LogMeta) => void;
  warn: (message: string, meta?: LogMeta) => void;
  error: (message: string, meta?: LogMeta) => void;
};

function buildConsoleLogger(): LoggerLike {
  const write = (level: "info" | "warn" | "error", message: string, meta?: LogMeta) => {
    const line = meta ? `${message} ${JSON.stringify(meta)}` : message;
    console[level](line);
  };

  return {
    info: (message, meta) => write("info", message, meta),
    warn: (message, meta) => write("warn", message, meta),
    error: (message, meta) => write("error", message, meta),
  };
}

function buildWinstonLogger(): LoggerLike | null {
  try {
    // Optional runtime dependency: if winston is installed, use structured logging.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const winston = require("winston");
    const logLevel = process.env.LOG_LEVEL ?? "info";
    return winston.createLogger({
      level: logLevel,
      format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      defaultMeta: { service: "upload-api" },
      transports: [new winston.transports.Console()],
    });
  } catch {
    return null;
  }
}

export const logger: LoggerLike = buildWinstonLogger() ?? buildConsoleLogger();
