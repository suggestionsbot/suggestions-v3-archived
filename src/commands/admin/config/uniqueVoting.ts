import SubCommand from '../../../structures/core/SubCommand';
import SuggestionsClient from '../../../structures/core/Client';
import CommandContext from '../../../structures/commands/Context';
import { CommandCategory, CommandNextFunction } from '../../../types';
import MessageUtils from '../../../utils/MessageUtils';
import Logger from '../../../utils/Logger';
import { CONFIG_OPTIONS, TRUTHY_CONFIG_OPTIONS, VIEW_STATUS } from '../../../utils/Constants';

export default class ConfigUniqueVotingCommand extends SubCommand {
  constructor(client: SuggestionsClient) {
    super(client);

    this.parent = 'config';
    this.arg = 'uniqueVoting';
    this.name = 'config-uniqueVoting';
    this.friendly = 'config uniqueVoting';
    this.category = CommandCategory.ADMIN;
    this.description = 'Configure if users should be able to add multiple reactions.';
    this.usages = [
      'config uniqueVoting [true|on|false|off|toggle]',
      'config uniqueVoting [true|on|false|off|toggle]'
    ];
    this.examples = [
      'config uniqueVoting true',
      'config uniqueVoting false',
      'config uniqueVoting on',
      'config uniqueVoting toggle'
    ];
    this.aliases = ['uniqueVote'];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis', 'embedLinks'];
  }

  async runPreconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    if (ctx.args.get(0) && !CONFIG_OPTIONS.includes(ctx.args.get(0).toLowerCase()))
      return MessageUtils.error(this.client, ctx.message,
        `Please provide one of the following arguments: \`${CONFIG_OPTIONS.join(', ')}\``);

    next();
  }

  async run(ctx: CommandContext): Promise<any> {
    try {
      const docsRef = `${this.client.config.docs}/docs/configuration.html`;
      const currentStatus = ctx.settings!.uniqueVoting;
      const viewStatus = (status: boolean): string => VIEW_STATUS(status, ['disabled', 'enabled']);

      const baseEmbed = MessageUtils.defaultEmbed()
        .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
        .setFooter(`Guild: ${ctx.guild!.id}`)
        .setTimestamp();

      if (!ctx.args.get(0)) {
        baseEmbed.setDescription(`Adding multiple votes to suggestions is **${viewStatus(currentStatus)}** in this guild.`);
        baseEmbed.addField('More Information', `[Link](${docsRef}#selfVoting)`);
        return ctx.embed(baseEmbed);
      }

      const userInput = ctx.args.get(0).toLowerCase();
      const status = TRUTHY_CONFIG_OPTIONS.includes(userInput) ? true : userInput === 'toggle' ? !currentStatus : false;
      const guildData = await ctx.getSettings()!;
      guildData.setUniqueVoting(status);
      await guildData.save();
      baseEmbed.setDescription(`Unique suggestion voting has been **${viewStatus(status)}** in this guild.`);
      await ctx.embed(baseEmbed);
    } catch (error) {
      Logger.error(error.stack);
      return MessageUtils.error(this.client, ctx.message, error.message, true);
    }
  }

  async runPostconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    if (ctx.args.get(0)) await this.client.redis.helpers.clearCachedGuild(ctx.guild!.id);
    next();
  }
}
