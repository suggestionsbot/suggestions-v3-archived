export default class ArgumentParser {
  public args: Array<string>;

  constructor(public raw: Array<string>) {
    this.args = [];

    for (const arg of raw) {
      if (!arg.startsWith('--')) this.args.push(arg);
      else break;
    }

  }
  public get(i: number): string {
    return this.args[i];
  }

  public has(i: number): boolean {
    return !!this.args[i];
  }

  public join(sep = ' '): string {
    return this.args.join(sep);
  }

  public slice(start?: number, end?: number): Array<string> {
    return this.args.slice(start, end);
  }
}
