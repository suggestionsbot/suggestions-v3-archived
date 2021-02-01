export default class ArgumentParser {
  args: Array<string>;

  constructor(raw: Array<string>) {
    this.args = [];

    for (const arg of raw) {
      if (!arg.startsWith('--')) this.args.push(arg);
      else break;
    }

  }
  get(i: number): string {
    return this.args[i];
  }

  has(i: number): boolean {
    return !!this.args[i];
  }

  join(sep = ' '): string {
    return this.args.join(sep);
  }

  slice(start?: number, end?: number): Array<string> {
    return this.args.slice(start, end);
  }
}
