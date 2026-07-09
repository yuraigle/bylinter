export const COLOR = {
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  reset: "\x1b[0m",
} as const;

export function systemMessage(message: string) {
  process.stdout.write(`${COLOR.yellow}> ${message}${COLOR.reset}\r\n`);
}

export function systemError(message: string) {
  process.stdout.write(`${COLOR.red}> ${message}${COLOR.reset}\r\n`);
}
