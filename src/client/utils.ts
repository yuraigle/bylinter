export const COLOR = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  reset: "\x1b[0m",
} as const;

export function systemMessage(message: string): void {
  process.stdout.write(`\n${COLOR.yellow}> ${message}${COLOR.reset}\n`);
}

export function systemError(message: string): void {
  process.stdout.write(`\n${COLOR.red}> ${message}${COLOR.reset}\n`);
}

export function debug(message: string): void {
  process.stdout.write(`\n${COLOR.cyan}${message}${COLOR.reset}\n`);
}

export function showme(message: string, newline: boolean): void {
  const prefix = `${COLOR.red}-${COLOR.green}:${COLOR.red}-${COLOR.reset} `;
  process.stdout.write((newline ? "\n" : "") + prefix + message + "\n");
}
