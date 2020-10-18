import { oneLine } from 'common-tags';

import Command from '../../structures/Command';
import SuggestionsClient from '../../structures/Client';
import Logger from '../../utils/Logger';
import Context from '../../structures/Context';
import { CommandCategory } from '../../types';

export default class PingCommand extends Command {
  constructor(public client: SuggestionsClient) {
    super(client);

    this.name = 'ping';
    this.category = CommandCategory.GENERAL;
    this.description = 'View the latency of the bot and it\'s connection to the Discord API.';
    this.aliases = ['pong'];
    this.guildOnly = false;
  }

  public async run(ctx: Context): Promise<any> {
    try {
      const msg = await ctx.send('🏓 Ping!');
      return msg.edit(oneLine`
        Pong! 
        Latency is \`${msg.timestamp - ctx.message.timestamp}ms\`.
        API Latency is \`${Math.round(ctx.shard!.latency)}ms\`.
      `);
    } catch (error) {
      Logger.error(`CMD:${this.name.toUpperCase()}`, error.stack);
    }
  }
}
