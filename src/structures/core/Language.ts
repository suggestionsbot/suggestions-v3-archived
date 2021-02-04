import frenchkiss, { StoreData } from 'frenchkiss';
import { LanguageInfo, LanguageStatus, Locales, Translation } from '../../types';
import LanguageError from '../../errors/LanguageError';

export default class Language {
  translator: string;
  contributors: Array<string>;
  completion: LanguageStatus;
  aliases: Array<Locales>;
  strings: { [x: string]: StoreData };
  code: Locales;
  flag: string;
  friendly: string;

  constructor(info: LanguageInfo) {
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

  get percentage(): number {
    switch (this.completion) {
      case LanguageStatus.INCOMPLETE: return 50;
      case LanguageStatus.COMPLETED: return 100;
      case LanguageStatus.MISSING: return 0;
    }
  }

  translate(key: string, args?: { [x: string]: string|number }|undefined): string {
    return frenchkiss.t(key, args, this.code);
  }

  lazyTranslate(translation: Translation): string {
    return this.translate(translation.key, translation.args);
  }
}
