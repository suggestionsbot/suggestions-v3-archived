import { GuildChannel } from 'eris';
import { oneLine } from 'common-tags';

import Command from '../../structures/command';
import SuggestionsClient from '../../structures/client';
import Logger from '../../utils/Logger';
import { SuggestionsMessage } from '../../types';

export default class PingCommand extends Command {
  constructor(public client: SuggestionsClient) {
    super(client);

    this.name = 'ping';
    this.category = 'General';
    this.description = 'View the latency of the bot and it\'s connection to the Discord API.';
    this.aliases = ['pong'];
    this.guildOnly = false;
    this.guarded = true;
  }

  public async run(message: SuggestionsMessage, args: Array<string>): Promise<any> {
    try {
      const ping = message.channel instanceof GuildChannel ? message.channel.guild.shard.latency : this.client.shards.get(0).latency;
      const msg = await message.channel.createMessage('🏓 Ping!');
      return msg.edit(oneLine`
        Pong! 
        Latency is \`${msg.timestamp - message.timestamp}ms\`.
        API Latency is \`${Math.round(ping)}ms\`.
      `);
    } catch (error) {
      Logger.error(`CMD:${this.name.toUpperCase()}`, error.stack);
    }
  }
}
