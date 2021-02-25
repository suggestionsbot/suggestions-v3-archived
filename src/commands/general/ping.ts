import { TextChannel } from 'eris';
import { stripIndents } from 'common-tags';

import Command from '../../structures/core/Command';
import SuggestionsClient from '../../structures/core/Client';
import Logger from '../../utils/Logger';
import Context from '../../structures/commands/Context';
import { CommandCategory } from '../../types';
import MessageUtils from '../../utils/MessageUtils';
import { ALLOWED_MENTIONS } from '../../utils/Constants';
import Util from '../../utils/Util';

export default class PingCommand extends Command {
  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'ping';
    this.category = CommandCategory.GENERAL;
    this.description = 'View the latency of the bot and it\'s connection to the Discord API.';
    this.aliases = ['pong'];
    this.guildOnly = false;
  }

  async run(ctx: Context): Promise<any> {
    try {
      const missingEmbedPermissions = ctx.guild ? Util.getMissingPermissions(['embedLinks'], <TextChannel>ctx.channel, ctx.me!) : [];
      if (missingEmbedPermissions.isEmpty()) {
        const msg = await ctx.embed(
          MessageUtils.defaultEmbed().setDescription('🏓 Ping!'),
          { messageReferenceID: ctx.message.id }
        );
        return msg.edit({
          embed: MessageUtils.defaultEmbed()
            .setAuthor('Pong!', this.client.user.avatarURL)
            .setDescription(stripIndents`
            **Latency:** ${msg.timestamp - ctx.message.timestamp}ms 
            **Shard ${ctx.shard!.id}**: ${Math.round(ctx.shard!.latency)}ms
          `),
          messageReferenceID: ctx.message.id,
          allowedMentions: ALLOWED_MENTIONS
        });
      } else {
        const msg = await ctx.send('🎈 Ping!', { messageReferenceID: ctx.message.id });
        return msg.edit({
          content: stripIndents`
            Pong!
            **Latency:** ${msg.timestamp - ctx.message.timestamp}ms 
            **Shard ${ctx.shard!.id}**: ${Math.round(ctx.shard!.latency)}ms
          `,
          messageReferenceID: ctx.message.id,
          allowedMentions: ALLOWED_MENTIONS
        });
      }
    } catch (error) {
      Logger.error(`CMD:${this.name.toUpperCase()}`, error.stack);
    }
  }
}
