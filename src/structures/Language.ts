import frenchkiss, { StoreData } from 'frenchkiss';
import { LanguageInfo, LanguageStatus, Translation } from '../types';

export default class Language {
  public translator: string;
  public contributors: Array<string>;
  public completion: LanguageStatus;
  public aliases: Array<string>;
  public strings: { [x: string]: StoreData };
  public code: string;
  public flag: string;
  public friendly: string;

  constructor(public info: LanguageInfo) {
    this.translator = info.translator;
    this.contributors = info.contributors;
    this.completion = info.completion;
    this.aliases = info.aliases || [];
    this.strings = info.strings;
    this.code = info.code;
    this.flag = info.flag;
    this.friendly = info.friendly;

    frenchkiss.set(this.code, this.strings);
  }

  public get percentage(): number {
    switch (this.completion) {
      case LanguageStatus.INCOMPLETE: return 50;
      case LanguageStatus.COMPLETED: return 100;
      case LanguageStatus.MISSING: return 0;
    }
  }

  public translate(key: string, language: string, args?: { [x: string]: string|number }|undefined): string {
    const keyExists = this.strings[key];
    if (keyExists) return frenchkiss.t(key, args, language);
    else throw new Error('InvalidLocaleKey');
  }

  public lazyTranslate(translation: Translation): string {
    return this.translate(translation.key, this.code, translation.args);
  }
}
