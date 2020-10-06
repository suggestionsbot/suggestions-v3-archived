import Command from '../../structures/Command';
import SuggestionsClient from '../../structures/Client';
import MessageEmbed from '../../utils/MessageEmbed';
import Logger from '../../utils/Logger';
import MessageUtils from '../../utils/MessageUtils';
import Context from '../../structures/Context';

export default class InfoCommand extends Command {
  constructor(public client: SuggestionsClient) {
    super(client);

    this.name = 'invite';
    this.category = 'General';
    this.description = 'Receive a DM with information on inviting the bot to your server.';
    this.usages = [
      'invite [here]'
    ];
    this.aliases = ['botinvite', 'getthebot'];
    this.guildOnly = false;
    this.guarded = true;
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

      if (ctx.guild && (ctx.args[0] !== 'here')) {
        const promises: Array<Promise<any>> = [
          ctx.message.addReaction('📩')
            .then(() => MessageUtils.delete(ctx.message, { timeout: 2500 })),
          ctx.dm({
            user: ctx.sender,
            embed: embed
          })
        ];

        await Promise.all(promises);
        return;
      } else {
        await ctx.embed(embed);
        return;
      }
    } catch (e) {
      if (e.message === 'Missing Access') return;
      Logger.error(`CMD:${this.name.toUpperCase()}`, e);
      return MessageUtils.error(this.client, ctx.message, e.message, true);
    }
  }
}
