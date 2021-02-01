import { Collection } from '@augu/immutable';
import path from 'path';

import SuggestionsClient from '../structures/core/Client';
import Logger from '../utils/Logger';
import Condition from '../structures/commands/Condition';
import Util from '../utils/Util';

export default class ConditionsManager extends Collection<Condition> {
  constructor(public client: SuggestionsClient) {
    super();
  }

  private static get directory(): string {
    return `${path.join(path.dirname(require.main!.filename), 'conditions')}`;
  }

  addCondition(name: string, check: Condition): void {
    this.set(name, check);
  }

  getCondition(name: string): Condition {
    return this.get(name)!;
  }

  async init(): Promise<void> {
    const files = Util.walk(ConditionsManager.directory, ['.js', '.ts']);
    if (!files.length) return Logger.warning('CHECKS', 'Couldn\'t find any command checks files!');

    for (const file of files) {
      const { default: CheckFile } = await import(file);
      const check = new CheckFile(this.client);
      this.client.conditions.addCondition(check.name, check);
      delete require.cache[file];
    }
  }
}
