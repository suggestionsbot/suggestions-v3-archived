import frenchkiss, { StoreData } from 'frenchkiss';
import { LanguageInfo, LanguageStatus, Translation } from '../types';
import LanguageError from '../errors/LanguageError';

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
    frenchkiss.onMissingKey((key, params, locale) => {
      throw new LanguageError('InvalidLocaleKey', `Missing the key **${key}** for language **${locale}**!`);
    });
    frenchkiss.onMissingVariable((variable, key, language) => {
      throw new LanguageError('InvalidLocaleVariable', `Missing the variable **${variable}** for key **${key}** in the language **${language}**!`);
    });
  }

  public get percentage(): number {
    switch (this.completion) {
      case LanguageStatus.INCOMPLETE: return 50;
      case LanguageStatus.COMPLETED: return 100;
      case LanguageStatus.MISSING: return 0;
    }
  }

  public translate(key: string, args?: { [x: string]: string|number }|undefined): string {
    return frenchkiss.t(key, args, this.code);
  }

  public lazyTranslate(translation: Translation): string {
    return this.translate(translation.key, translation.args);
  }
}
