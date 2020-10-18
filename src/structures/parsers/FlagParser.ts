type FlagDictionary = { [x: string]: string | true };

export default class FlagParser {
  public flags: string;

  constructor(public raw: Array<string>) {
    this.flags = raw.join(' ');
  }

  public parse(): FlagDictionary {
    const parsed: FlagDictionary = {};
    if (!this.flags.includes('-')) return {};

    const flagPartitioned = this.flags
      .split('-')
      .filter((x, i) => i == 0 || x !== '');
    for (const flag of flagPartitioned.slice(1)) {
      if (
        !flag.includes('=') ||
          flag[0] === '=' ||
          flag[flag.length - 1] === '='
      ) {
        parsed[flag.split(' ').filter((x, i) => i == 0 || x !== '')[0]] = true;
        continue;
      }
      const a = flag.split(/\s*=\s*/)[0];
      const b = flag.slice(flag.indexOf('=') + 1).trim();
      parsed[a] = b;
    }
    return parsed;
  }

  public get(flag: string): string|boolean {
    const flags = this.parse();
    return flags[flag];
  }

  public has(flag: string): boolean {
    const flags = this.parse();
    // eslint-disable-next-line no-prototype-builtins
    return flags.hasOwnProperty(flag);
  }
}
