const BASE62 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function toBase62(num: number): string {
  let result = '';
  while (num > 0) {
    result = BASE62[num % 62] + result;
    num = Math.floor(num / 62);
  }
  return result || '0';
}

export function fromBase62(str: string): number {
  let num = 0;
  for (const char of str) {
    num = num * 62 + BASE62.indexOf(char);
  }
  return num;
}
