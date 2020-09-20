import path from 'path';
import { promisify } from 'util';
import globFunction from 'glob';

import SuggestionsClient from '../structures/client';
import { Event } from '../types';

const glob = promisify(globFunction);

export default class CoreLoaders {
  constructor(public client: SuggestionsClient) {
    this.client = client;
  }

  private static get _directory(): string {
    return `${path.dirname(require.main.filename)}${path.sep}`;
  }

  public async loadCommands(): Promise<void> {
    const dir: string = this.client.production ? `${CoreLoaders._directory}commands/**/*.js` :
      `${CoreLoaders._directory}commands/**/*.ts`;

    return glob(dir).then(async (commandFiles: any) => {
      for (const file of commandFiles) {
        const { default: CommandFile } = await import(file);
        const command = new CommandFile(this.client);
        if (!command.parent) {
          this.client.commands.set(command.name, command);
          if (command.aliases.length) {
            for (const alias of command.aliases) this.client.aliases.set(alias, command.name);
          }
        } else {
          this.client.subCommands.set(command.name, command);
          if (command.aliases.length) {
            for (const alias of command.aliases) this.client.subCommandAliases.set(alias, command.name);
          }
        }
        delete require.cache[file];
      }
    });
  }

  public async loadListeners(): Promise<void> {
    const dir: string = this.client.production ? `${CoreLoaders._directory}listeners/**/*.js` :
      `${CoreLoaders._directory}listeners/**/*.ts`;

    return glob(dir).then(async (eventFiles: any) => {
      for (const file of eventFiles) {
        const { name } = path.parse(file);
        const { default: EventFile } = await import(file);
        const event = new EventFile(this.client, name) as Event;
        this.client.events.set(event.name ?? name, event);
        this.client[event.type](event.name ?? name, (...args: Array<any>) => event.run(...args));
        delete require.cache[require.resolve(file)];
      }
    });
  }
}
