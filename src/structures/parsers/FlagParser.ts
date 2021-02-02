type FlagDictionary = { [x: string]: string | true };

export default class FlagParser {
  flags: string;

  constructor(raw: Array<string>) {
    this.flags = raw.join(' ');
  }

  parse(): FlagDictionary {
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
      parsed[a] = flag.slice(flag.indexOf('=') + 1).trim();
    }
    return parsed;
  }

  get(flag: string): string|undefined {
    const flags = this.parse();
    if (Object.prototype.hasOwnProperty.call(flags, flag)) return <string>flags[flag];
    else return;
  }

  has(flag: string): boolean {
    const flags = this.parse();
    return Object.prototype.hasOwnProperty.call(flags, flag);
  }
}
