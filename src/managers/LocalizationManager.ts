import globFunction from 'glob';
import { promisify } from 'util';
import { Collection } from '@augu/immutable';
import path from 'path';

import SuggestionsClient from '../structures/core/Client';
import Language from '../structures/core/Language';
import Logger from '../utils/Logger';

const glob = promisify(globFunction);

export default class LocalizationManager extends Collection<Language> {
  constructor(public client: SuggestionsClient) {
    super();
  }

  private static get _directory(): string {
    return `${path.join(process.cwd(), 'locales', '**', '*.json')}`;
  }

  public addLanguage(locale: Language): void {
    this.set(locale.code, locale);
  }

  public async init(): Promise<void> {
    return glob(LocalizationManager._directory).then(async (files: any) => {
      if (!files.length) return Logger.warning('LOCALIZATION', 'Couldn\'t find any localization files!');

      for (const file of files) {
        const lang: Language = await import(file);
        const locale = new Language(lang);
        this.addLanguage(locale);
      }
    });
  }

  public getLocale(code: string): Language {
    return this.find(x => x.code === code || x.aliases.includes(code))!;
  }
}
