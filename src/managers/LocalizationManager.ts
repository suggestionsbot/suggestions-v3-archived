import { Collection } from '@augu/immutable';
import path from 'path';

import SuggestionsClient from '../structures/core/Client';
import Language from '../structures/core/Language';
import Logger from '../utils/Logger';
import Util from '../utils/Util';
import { Locales } from '../types';

export default class LocalizationManager extends Collection<Language> {
  constructor(public client: SuggestionsClient) {
    super();
  }

  private static get directory(): string {
    return `${path.join(process.cwd(), 'locales')}`;
  }

  addLanguage(locale: Language): void {
    this.set(locale.code, locale);
  }

  async init(): Promise<void> {
    const files = Util.walk(LocalizationManager.directory, ['.json']);
    if (!files.length) return Logger.warning('LOCALIZATION', 'Couldn\'t find any localization files!');

    for (const file of files) {
      const lang: Language = await import(file);
      const locale = new Language(lang);
      this.addLanguage(locale);
    }
  }

  getLocale(code: Locales): Language {
    return this.find(x => x.code === code || x.aliases.includes(code))!;
  }
}
