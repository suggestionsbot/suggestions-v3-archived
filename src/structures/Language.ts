import { LanguageInfo, LanguageStatus, Translation } from '../types';

export default class Language {
  public translator: string;
  public contributors: Array<string>;
  public completion: LanguageStatus;
  public aliases: Array<string>;
  public strings: { [x: string]: string|Record<string, unknown> };
  public code: string;
  public flag: string;
  public friendly: string;

  constructor(public info: LanguageInfo) {
    this.translator = info.translator;
    this.contributors = info.contributors;
    this.completion = LanguageStatus[info.completion];
    this.aliases = info.aliases || [];
    this.strings = info.strings;
    this.code = info.code;
    this.flag = info.flag;
    this.friendly = info.friendly;
  }

  public get percentage(): number {
    switch (this.completion) {
      case LanguageStatus.INCOMPLETE: return 50;
      case LanguageStatus.COMPLETED: return 100;
      case LanguageStatus.MISSING: return 0;
    }
  }

  public translate(key: string, args?: { [x: string]: any }): string {
    const nodes = key.split('.');
    let translated: any = this.strings;

    for (const fragment of nodes) {
      try {
        translated = translated[fragment];
      } catch {
        translated = null;
        break;
      }
    }

    if (translated === null) return `Key "${key}" was not found.`;
    if (typeof translated === 'object' && !Array.isArray(translated)) return `Key "${key}" is an object!`;

    if (Array.isArray(translated)) return (translated as string[]).map(x => this._translate(x, args)).join('\n');
    else return this._translate(translated, args);
  }

  public lazyTranslate(translation: Translation): string {
    return this.translate(translation.key, translation.args);
  }

  private _translate(translated: string, args?: { [x: string]: string }): string {
    // eslint-disable-next-line
    const KEY_REGEX = /[$]\{([\w\.]+)\}/g;
    return translated.replace(KEY_REGEX, (_, key) => {
      if (args) {
        const value = String(args[key]);

        // Ignore empty strings
        if (value === '') return '';
        else return value || '?';
      } else {
        return '?';
      }
    }).trim();
  }
}
