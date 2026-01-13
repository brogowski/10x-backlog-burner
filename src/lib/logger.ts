type LogLevel = "debug" | "info" | "warn" | "error";

type LogMeta = Record<string, unknown> | undefined;

const writers: Record<LogLevel, (...args: unknown[]) => void> = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

const formatPrefix = (level: LogLevel) => `[${new Date().toISOString()}] [${level.toUpperCase()}]`;

const write = (level: LogLevel, message: string, meta: LogMeta) => {
  const prefix = formatPrefix(level);
  const payload = meta ? [prefix, message, meta] : [prefix, message];
  writers[level](...payload);
};

export const logger = {
  debug: (message: string, meta?: Record<string, unknown>) => write("debug", message, meta),
  info: (message: string, meta?: Record<string, unknown>) => write("info", message, meta),
  warn: (message: string, meta?: Record<string, unknown>) => write("warn", message, meta),
  error: (message: string, meta?: Record<string, unknown>) => write("error", message, meta),
};
