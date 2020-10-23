import Command from '../../structures/Command';
import SuggestionsClient from '../../structures/Client';
import MessageEmbed from '../../utils/MessageEmbed';
import Logger from '../../utils/Logger';
import MessageUtils from '../../utils/MessageUtils';
import Context from '../../structures/Context';
import { CommandCategory } from '../../types';
import { oneLine } from 'common-tags';

export default class InfoCommand extends Command {
  constructor(public client: SuggestionsClient) {
    super(client);

    this.name = 'invite';
    this.category = CommandCategory.GENERAL;
    this.description = 'Receive a DM with information on inviting the bot to your server.';
    this.usages = [
      'invite [here]'
    ];
    this.aliases = ['botinvite', 'getthebot'];
    this.guildOnly = false;
  }

  async run(ctx: Context): Promise<any> {
    const { colors: { main }, discord, invite, website } = this.client.config;

    try {
      const embed = new MessageEmbed()
        .setAuthor('Bot Invite Information', this.client.user.avatarURL)
        .setDescription(`Hello ${ctx.sender.mention},
        
          **Before inviting, you need the** \`MANAGE SERVER\` **or** \`ADMINISTRATOR\` **permissions to add bots to a server.** 
      
          **Bot Invite:**
          ${invite}

          **Website:**
          ${website}

          **Support Server:**
          ${discord}
      `)
        .setColor(main)
        .setTimestamp();

      if (ctx.guild && (ctx.args.get(0) !== 'here')) {
        await ctx.dm({
          user: ctx.sender,
          embed: embed
        });
        await ctx.message.addReaction('📩')
          .then(() => MessageUtils.delete(ctx.message, { timeout: 2500 }));
      } else {
        await ctx.embed(embed);
        return;
      }
    } catch (e) {
      if (e.code === 50007) return MessageUtils.error(this.client, ctx.message,
        oneLine`Cannot DM you the invite information! Please enable your DMs for this server or do 
          \`${ctx.prefix + this.name} here\` to get the invite information.`);
      Logger.error(`CMD:${this.name.toUpperCase()}`, e);
      return MessageUtils.error(this.client, ctx.message, e.message, true);
    }
  }
}
