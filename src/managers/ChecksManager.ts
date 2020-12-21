import SuggestionsClient from '../structures/core/Client';
import { Collection } from '@augu/immutable';
import path from 'path';
import globFunction from 'glob';
import { promisify } from 'util';

import Logger from '../utils/Logger';
import Check from '../structures/commands/Check';

const glob = promisify(globFunction);

export default class ChecksManager extends Collection<Check> {
  constructor(public client: SuggestionsClient) {
    super();
  }

  private static get directory(): string {
    return `${path.join(path.dirname(require.main!.filename), 'checks', '**', '*.{ts,js}')}`;
  }

  public addCheck(name: string, check: Check): void {
    this.set(name, check);
  }

  public getCheck(name: string): Check {
    return this.get(name)!;
  }

  public async init(): Promise<void> {
    return glob(ChecksManager.directory).then(async (files: any) => {
      if (!files.length) return Logger.warning('CHECKS', 'Couldn\'t find any command checks files!');

      for (const file of files) {
        const { default: CheckFile } = await import(file);
        const check = new CheckFile(this.client);
        this.client.checks.addCheck(check.name, check);
        delete require.cache[file];
      }
    });
  }
}
