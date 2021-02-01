import { Collection } from '@augu/immutable';
import path from 'path';

import SuggestionsClient from '../structures/core/Client';
import Logger from '../utils/Logger';
import { Event } from '../types';
import Util from '../utils/Util';

export default class ListenerManager extends Collection<Event> {
  constructor(public client: SuggestionsClient) {
    super();
  }

  private static get directory(): string {
    return `${path.join(path.dirname(require.main!.filename), 'listeners')}`;
  }

  addEvent(name: string, event: Event): void {
    this.set(name, event);
  }

  async init(): Promise<void> {
    const files = Util.walk(ListenerManager.directory, ['.js', '.ts']);
    if (!files.length) return Logger.error('LISTENERS', 'Couldn\'t find any event listener files!');

    for (const file of files) {
      const { name } = path.parse(file);
      const { default: EventFile } = await import(file);
      const event: Event = new EventFile(this.client, name);
      this.addEvent(event.name ?? name, event);
      this.client.on(event.name ?? name, (...args: Array<any>) => event.run(...args));
      delete require.cache[require.resolve(file)];
    }
  }
}
