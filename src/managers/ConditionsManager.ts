import SuggestionsClient from '../structures/core/Client';
import { Collection } from '@augu/immutable';
import path from 'path';
import globFunction from 'glob';
import { promisify } from 'util';

import Logger from '../utils/Logger';
import Condition from '../structures/commands/Condition';

const glob = promisify(globFunction);

export default class ConditionsManager extends Collection<Condition> {
  constructor(public client: SuggestionsClient) {
    super();
  }

  private static get directory(): string {
    return `${path.join(path.dirname(require.main!.filename), 'conditions', '**', '*.{ts,js}')}`;
  }

  public addCondition(name: string, check: Condition): void {
    this.set(name, check);
  }

  public getCondition(name: string): Condition {
    return this.get(name)!;
  }

  public async init(): Promise<void> {
    return glob(ConditionsManager.directory).then(async (files: any) => {
      if (!files.length) return Logger.warning('CHECKS', 'Couldn\'t find any command checks files!');

      for (const file of files) {
        const { default: CheckFile } = await import(file);
        const check = new CheckFile(this.client);
        this.client.conditions.addCondition(check.name, check);
        delete require.cache[file];
      }
    });
  }
}
