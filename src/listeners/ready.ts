import Event from '../structures/event';

import SuggestionsClient from '../structures/client';
import { version } from '../../package.json';
import Logger from '../utils/Logger';

export default class extends Event {
  constructor(public client: SuggestionsClient, public name: string) {
    super(client, name, {
      once: true
    });

    this.name = 'ready';
  }

  public async run(): Promise<any> {
    const readyMessages: Array<string> = [
      `🔖 Version ${version} of the bot loaded in ${process.env.NODE_ENV.toUpperCase().trim()}.`,
      `🤖 Logged in as ${this.client.user.username}#${this.client.user.discriminator} (${this.client.user.id}).`,
      `⚙ Loaded (${this.client.commands.size}) commands!`,
      `⚙ Loaded (${this.client.subCommands.size}) subcommands!`,
      `👂 Loaded (${this.client.events.size}) events!`
    ];

    try {
      await this.client.database.init();
      await this.client.redis.init();
      for (const m of readyMessages) await Logger.ready(m);
      this.client.updateBotPresence();
    } catch (e) {
      Logger.error('READY EVENT', e);
    }
  }
}
