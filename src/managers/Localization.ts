// import { readdirSync } from 'fs';
import globFunction from 'glob';
import { promisify } from 'util';
import { Collection } from '@augu/immutable';
import path from 'path';

import SuggestionsClient from '../structures/Client';
import Language from '../structures/Language';
import Logger from '../utils/Logger';

const glob = promisify(globFunction);

export default class LocalizationManager extends Collection<Language> {
  constructor(public client: SuggestionsClient) {
    super();

    this.client = client;
  }

  private static get _directory(): string {
    return process.cwd() + path.sep;
  }

  public addLanguage(locale: Language): void {
    this.set(locale.code, locale);
  }

  public async init(): Promise<void> {
    return glob(`${LocalizationManager._directory}locales/**/*.json`).then(async (files: any) => {
      if (!files.length) return Logger.warning('LOCALIZATION', 'Couldn\'t find any localization files!');

      for (const file of files) {
        const lang: Language = await import(file);
        Logger.success('LANGUAGE FOUND', `Found language ${lang.code}!`);
        const locale = new Language(lang);
        this.addLanguage(locale);
      }
    });
  }

  public getLocale(code: string): Language {
    return this.find(x => x.code === code || x.aliases.includes(code));
  }
}
