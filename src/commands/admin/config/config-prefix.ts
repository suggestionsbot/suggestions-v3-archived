import { stripIndents } from 'common-tags';

import SubCommand from '../../../structures/SubCommand';
import SuggestionsClient from '../../../structures/Client';
import { CommandNextFunction } from '../../../types';
import Logger from '../../../utils/Logger';
import MessageUtils from '../../../utils/MessageUtils';
import Context from '../../../structures/Context';

export default class ConfigPrefixCommand extends SubCommand {
  constructor(public client: SuggestionsClient) {
    super(client);

    this.parent = 'config';
    this.arg = 'prefix';
    this.name = 'config-prefix';
    this.friendly = 'config prefix';
    this.category = 'admin';
    this.description = 'Update the bot\'ts prefixes in the guild.';
    this.usages = ['config prefix [value]'];
    this.examples = ['config prefix ^'];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis'];
  }

  public async runPreconditions(ctx: Context, next: CommandNextFunction): Promise<any> {
    if (ctx.args[0] && (ctx.args[0].length > 5)) return ctx.send('The prefix must be **5** characters or less!');

    const prefixExists = ctx.settings!.prefixes.includes(ctx.args[0]);
    const cmdCheck = this.client.commands.getCommand(ctx.args[0]);
    if (ctx.args[0] && cmdCheck) return ctx.send(`The prefix \`${ctx.args[0]}\` cannot be set as it's a command!`);
    if (ctx.args[0] && prefixExists && (ctx.settings!.prefixes.length === 1)) return ctx.send('You cannot remove any more prefixes!');
    next();
  }

  public async run(ctx: Context): Promise<any> {
    try {
      const docsRef = `${this.client.config.docs}/docs/configuration.html`;
      const baseEmbed = MessageUtils.defaultEmbed()
        .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
        .setFooter(`Guild: ${ctx.guild!.id}`)
        .setTimestamp();

      if (!ctx.args[0]) {
        let i = 1;
        baseEmbed.setDescription(stripIndents`My prefixes ${ctx.guild ? 'in this guild' : ''} are:

        ${this.client.getPrefixes(false, true, ctx.settings).map(p => `**${i++}** ${p}`).join('\n')}
      `);
        baseEmbed.addField('Usages', `\`${ctx.prefix + this.usages!.join('\n')}\``, true);
        baseEmbed.addField('Examples', `\`${ctx.prefix + this.examples!.join('\n')}\``, true);
        baseEmbed.addField('More Information', `[Link](${docsRef}#prefix)`);
        return ctx.embed(baseEmbed);
      }

      const prefixExists = ctx.settings!.prefixes.includes(ctx.args[0]);
      baseEmbed.setDescription(`The prefix \`${ctx.args[0]}\` has been **${prefixExists ? 'removed from' : 'added to'}** the bot's prefixes.`);
      const guildData = await this.client.database.guildHelpers.getGuild(ctx.guild!, false);
      Logger.log('guildData', guildData);
      guildData.updatePrefixes(ctx.args[0]);
      await guildData.save();
      await ctx.embed(baseEmbed);
    } catch (error) {
      Logger.error(error.stack);
      return MessageUtils.error(this.client, ctx.message, error.message, true);
    }
  }

  public async runPostconditions(ctx: Context, next: CommandNextFunction): Promise<any> {
    if (ctx.args[0]) await this.client.redis.helpers.clearCachedGuild(ctx.guild!.id);
    next();
  }
}
