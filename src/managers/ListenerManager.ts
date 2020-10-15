import { Collection } from '@augu/immutable';
import path from 'path';
import globFunction from 'glob';
import { promisify } from 'util';

import SuggestionsClient from '../structures/Client';
import Event from '../structures/Event';
import Logger from '../utils/Logger';

const glob = promisify(globFunction);

export default class ListenerManager extends Collection<Event> {
  constructor(public client: SuggestionsClient) {
    super();
  }

  private static get _directory(): string {
    return `${path.join(path.dirname(require.main.filename), 'listeners', '**', '*.{ts,js}')}`;
  }

  public addEvent(name: string, event: Event): void {
    this.set(name, event);
  }

  public async init(): Promise<void> {
    return glob(ListenerManager._directory).then(async (files: any) => {
      if (!files.length) return Logger.error('LISTENERS', 'Couldn\'t find any event listener files!');

      for (const file of files) {
        const { name } = path.parse(file);
        const { default: EventFile } = await import(file);
        const event = new EventFile(this.client, name);
        this.addEvent(event.name ?? name, event);
        this.client[event.type](event.name ?? name, (...args: Array<any>) => event.run(...args));
        delete require.cache[require.resolve(file)];
      }
    });
  }
}
