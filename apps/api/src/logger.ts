export type LogFields = Record<
  string,
  boolean | number | string | null | undefined
>;

export interface SafeLogger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

function serialize(level: string, event: string, fields?: LogFields): string {
  const safeFields = Object.fromEntries(
    Object.entries(fields ?? {}).filter(([, value]) => value !== undefined)
  );
  return JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...safeFields
  });
}

export const consoleLogger: SafeLogger = {
  info(event, fields) {
    console.info(serialize("info", event, fields));
  },
  warn(event, fields) {
    console.warn(serialize("warn", event, fields));
  },
  error(event, fields) {
    console.error(serialize("error", event, fields));
  }
};
