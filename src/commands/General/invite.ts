import Command from '../../structures/command';
import SuggestionsClient from '../../structures/client';
import { GuildSchema, SuggestionsMessage } from '../../types';
import MessageEmbed from '../../utils/MessageEmbed';
import Logger from '../../utils/Logger';
import MessageUtils from '../../utils/MessageUtils';

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

  async run(message: SuggestionsMessage, args: Array<string>, settings?: GuildSchema): Promise<any> {
    const { colors: { main }, discord, invite, website } = this.client.config;

    try {
      const dmEmbed = new MessageEmbed()
        .setAuthor('Bot Invite Information', this.client.user.avatarURL)
        .setDescription(`Hello ${message.author.mention},
        
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

      if (message.guildID && (args[0] !== 'here')) {
        const promises: Array<Promise<any>> = [
          message.addReaction('📩')
            .then(() => MessageUtils.delete(message, { timeout: 2500 })),
          message.author.getDMChannel().then(channel => channel.createMessage({ embed: dmEmbed }))
        ];

        await Promise.all(promises);
        return;
      } else {
        await message.channel.createMessage({ embed: dmEmbed });
        return;
      }
    } catch (e) {
      if (e.message === 'Missing Access') return;
      Logger.error(`CMD:${this.name.toUpperCase()}`, e);
      return MessageUtils.error(this.client, message, e.message, true);
    }
  }
}
