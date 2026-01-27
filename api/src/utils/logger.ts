// utils/logger.ts

type LogLevel = "INFO" | "ERROR";

function now(): string {
  return new Date().toISOString();
}

function log(level: LogLevel, where: string, message: string, data?: unknown) {
  const prefix = `[${now()}] [${level}] ${where}:`;

  if (data !== undefined) {
    console.log(prefix, message, data);
  } else {
    console.log(prefix, message);
  }
}

export const logger = {
  info: (where: string, message: string, data?: unknown) => {
    log("INFO", where, message, data);
  },

  error: (where: string, err: unknown) => {
    console.error(`[${now()}] [ERROR] ${where}:`);

    if (err instanceof Error) {
      console.error(err.message);
      if (err.stack) console.error(err.stack);
    } else {
      console.error(err);
    }
  },
};
