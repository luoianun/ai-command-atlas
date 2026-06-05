const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";

function timestamp(): string {
  return new Date().toTimeString().slice(0, 8);
}

export function createLogger(toolName: string) {
  const prefix = `${DIM}${timestamp()}${RESET} [${CYAN}${toolName}${RESET}]`;

  return {
    info: (msg: string) =>
      process.stderr.write(`${prefix} ${msg}\n`),
    warn: (msg: string) =>
      process.stderr.write(`${prefix} ${YELLOW}${msg}${RESET}\n`),
    error: (msg: string) =>
      process.stderr.write(`${prefix} ${RED}${msg}${RESET}\n`),
    success: (msg: string) =>
      process.stderr.write(`${prefix} ${GREEN}${msg}${RESET}\n`),
  };
}
