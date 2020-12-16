import Event from '../structures/core/Event';

import SuggestionsClient from '../structures/core/Client';
import { version } from '../../package.json';
import Logger from '../utils/Logger';
import Util from '../utils/Util';

export default class extends Event {
  constructor(public client: SuggestionsClient, public name: string) {
    super(client, name);
  }

  public async run(): Promise<any> {
    const readyMessages: Array<string> = [
      `🔖 Version ${version} of the bot loaded in ${this.client.production ? 'PRODUCTION' : 'DEVELOPMENT'}.`,
      `⚙ Loaded (${this.client.commands.size}) commands!`,
      `⚙ Loaded (${this.client.subCommands.size}) subcommands!`,
      `👂 Loaded (${this.client.events.size}) events!`,
      `🌐 Loaded (${this.client.locales.size}) locales!`,
      `✅ Loaded (${this.client.checks.size}) checks!`
    ];

    try {
      await this.client.database.init();
      this.client.redis.init();
      for (const m of readyMessages) await Logger.event(this.name, m);
      Logger.ready(`🤖 Logged in as ${Util.formatUserTag(this.client.user)} (${this.client.user.id}).`);
      this.client.updateBotPresence();
      if (this.client.production) {
        this.client.botlists.init();
        this.client.botlists.start();
      }
    } catch (e) {
      Logger.error('READY EVENT', e);
    }
  }
}
