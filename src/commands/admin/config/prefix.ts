import { oneLine, stripIndents } from 'common-tags';

import SubCommand from '../../../structures/core/SubCommand';
import SuggestionsClient from '../../../structures/core/Client';
import { CommandCategory, CommandNextFunction } from '../../../types';
import Logger from '../../../utils/Logger';
import MessageUtils from '../../../utils/MessageUtils';
import Context from '../../../structures/commands/Context';
import Util from '../../../utils/Util';

export default class ConfigPrefixCommand extends SubCommand {
  constructor(client: SuggestionsClient) {
    super(client);

    this.parent = 'config';
    this.arg = 'prefix';
    this.name = 'config-prefix';
    this.friendly = 'config prefix';
    this.category = CommandCategory.ADMIN;
    this.description = 'Update the bot\'s prefixes in the guild.';
    this.usages = ['config prefix [value]'];
    this.examples = ['config prefix ^'];
    this.aliases = ['prefixes'];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis', 'embedLinks'];
  }

  async runPreconditions(ctx: Context, next: CommandNextFunction): Promise<any> {
    if (ctx.args.get(0) && (ctx.args.args.length > 5))
      return MessageUtils.error(this.client, ctx.message, 'The prefix must be **5** characters or less!');

    const prefixExists = ctx.settings!.prefixes.includes(ctx.args.get(0));
    const cmdCheck = this.client.commands.getCommand(ctx.args.get(0));
    const roleCheck = Util.getRole(ctx.args.get(0), ctx);
    const channelCheck = Util.getChannel(ctx.args.get(0), ctx.guild!);
    if (ctx.args.get(0) && cmdCheck)
      return MessageUtils.error(this.client, ctx.message,`The prefix \`${ctx.args.get(0)}\` cannot be set as it's a command!`);
    if (ctx.args.get(0) && channelCheck)
      return MessageUtils.error(this.client, ctx.message,`The prefix \`${ctx.args.get(0)}\` cannot be set as it's a channel!`);
    if (ctx.args.get(0) && roleCheck)
      return MessageUtils.error(this.client, ctx.message,`The prefix \`${ctx.args.get(0)}\` cannot be set as it's a role!`);
    if (ctx.args.get(0) && prefixExists && (ctx.settings!.prefixes.length === 1))
      return MessageUtils.error(this.client, ctx.message, 'You cannot remove any more prefixes!');

    next();
  }

  async run(ctx: Context): Promise<any> {
    try {
      const docsRef = `${this.client.config.docs}/docs/configuration.html`;
      const baseEmbed = MessageUtils.defaultEmbed()
        .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
        .setFooter(`Guild: ${ctx.guild!.id}`)
        .setTimestamp();

      if (!ctx.args.get(0)) {
        let i = 1;
        baseEmbed.setDescription(stripIndents`My prefixes ${ctx.guild ? 'in this guild' : ''} are:

          ${this.client.getPrefixes(false, true, ctx.settings).map(p => `**${i++})** ${p}`).join('\n')}`);
        baseEmbed.addField('More Information', `[Link](${docsRef}#prefix)`);
        return ctx.embed(baseEmbed);
      }

      const prefixExists = ctx.settings!.prefixes.includes(ctx.args.get(0));
      const guildData = await ctx.getSettings()!;
      guildData.updatePrefixes(ctx.args.get(0));
      await guildData.save();
      baseEmbed.setDescription(oneLine`The prefix \`${ctx.args.get(0)}\` has been 
        **${prefixExists ? 'removed from' : 'added to'}** the guild's prefixes.`);
      await ctx.embed(baseEmbed);
    } catch (error) {
      Logger.error(error.stack);
      return MessageUtils.error(this.client, ctx.message, error.message, true);
    }
  }

  async runPostconditions(ctx: Context, next: CommandNextFunction): Promise<any> {
    if (ctx.args.get(0)) await this.client.redis.helpers.clearCachedGuild(ctx.guild!.id);
    next();
  }
}
