import Event from '../structures/Event';

import SuggestionsClient from '../structures/Client';
import { version } from '../../package.json';
import Logger from '../utils/Logger';
import Util from '../utils/Util';

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
      `⚙ Loaded (${this.client.commands.size}) commands!`,
      `⚙ Loaded (${this.client.subCommands.size}) subcommands!`,
      `👂 Loaded (${this.client.events.size}) events!`,
      `🌐 Loaded (${this.client.locales.size}) locales!`
    ];

    try {
      await this.client.database.init();
      await this.client.redis.init();
      for (const m of readyMessages) await Logger.event(this.name, m);
      Logger.ready(`🤖 Logged in as ${Util.formatUserTag(this.client.user)} (${this.client.user.id}).`);
      this.client.updateBotPresence();
    } catch (e) {
      Logger.error('READY EVENT', e);
    }
  }
}
