import { GuildTextableChannel, Message } from 'eris';
import { stripIndents } from 'common-tags';

import SubCommand from '../../../structures/subcommand';
import SuggestionsClient from '../../../structures/client';
import { CommandNextFunction, GuildSchema, SuggestionsMessage } from '../../../types';
import Logger from '../../../utils/Logger';
import MessageEmbed from '../../../utils/MessageEmbed';
import MessageUtils from '../../../utils/MessageUtils';

export default class ConfigPrefixCommand extends SubCommand {
  constructor(public client: SuggestionsClient) {
    super(client);

    this.parent = 'config';
    this.arg = 'prefix';
    this.name = 'config-prefix';
    this.friendly = 'config prefix';
    this.category = 'Admin';
    this.description = 'Update the bot\'ts prefixes in the guild.';
    this.usages = [
      'config prefix [value]'
    ];
    this.examples = [
      'config prefix ^'
    ];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis'];
    this.guarded = true;
    this.guildOnly = true;
  }

  public async runPreconditions(message: Message, args: Array<string>, next: CommandNextFunction, settings: GuildSchema): Promise<any> {
    if (args[0] && (args[0].length > 5)) return message.channel.createMessage('The prefix must be **5** characters or less!');

    const prefixExists = settings.prefixes.includes(args[0]);
    const cmdCheck = this.client.commands.get(args[0]) || this.client.commands.get(this.client.aliases.get(args[0]));
    if (args[0] && cmdCheck) return message.channel.createMessage(`The prefix \`${args[0]}\` cannot be set as it's a command!`);
    if (args[0] && prefixExists && (settings.prefixes.length === 1)) return message.channel.createMessage('You cannot remove any more prefixes!');
    next();
  }

  public async run(message: SuggestionsMessage, args: Array<string>, settings: GuildSchema): Promise<any> {
    try {
      const docsRef = `${this.client.config.docs}/docs/configuration.html`;
      const baseEmbed = MessageUtils.defaultEmbed()
        .setAuthor(message.guild.name, message.guild.iconURL)
        .setFooter(`Guild: ${message.guildID}`)
        .setTimestamp();

      if (!args[0]) {
        let i = 1;
        baseEmbed.setDescription(stripIndents`My prefixes ${message.guild ? 'in this guild' : ''} are:

        ${this.client.getPrefixes(false, settings).map(p => `**${i++})** ${p}`).join('\n')}
      `);
        baseEmbed.addField('Usages', `\`${message.prefix + this.usages.join('\n')}\``, true);
        baseEmbed.addField('Examples', `\`${message.prefix + this.examples.join('\n')}\``, true);
        baseEmbed.addField('More Information', `[Link](${docsRef}#prefix)`);
        return (message.channel as GuildTextableChannel).createMessage({ embed: baseEmbed });
      }

      const prefixExists = settings.prefixes.includes(args[0]);
      baseEmbed.setDescription(`The prefix \`${args[0]}\` has been **${prefixExists ? 'removed from' : 'added to'}** the bot's prefixes.`);
      const guildData = await this.client.database.guildHelpers.getGuild(message.guildID, false);
      guildData.updatePrefixes(args[0]);
      await guildData.save();
      await message.channel.createMessage({ embed: baseEmbed });
    } catch (error) {
      Logger.error(error.stack);
    }
  }

  public async runPostconditions(message: Message, args: Array<string>, next: CommandNextFunction, settings: GuildSchema): Promise<any> {
    if (args[0]) await this.client.redis.helpers.clearCachedGuild(message.guildID);
  }
}
