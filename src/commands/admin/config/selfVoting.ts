import SubCommand from '../../../structures/core/SubCommand';
import SuggestionsClient from '../../../structures/core/Client';
import CommandContext from '../../../structures/commands/Context';
import { CommandNextFunction } from '../../../types';
import MessageUtils from '../../../utils/MessageUtils';
import Logger from '../../../utils/Logger';

export default class ConfigSelfVotingCommand extends SubCommand {
  // TODO: put into constants file
  #values: Array<string>;

  constructor(client: SuggestionsClient) {
    super(client);

    this.parent = 'config';
    this.arg = 'selfVoting';
    this.name = 'selfvoting';
    this.friendly = 'config selfvoting';
    this.description = 'Configure if users should be able to vote on their own suggestions.';
    this.usages = [
      'config selfvoting [true|false|toggle]',
      'config selfvote [true|false|toggle]'
    ];
    this.examples = [
      'config selfvoting true',
      'config selfvote false',
      'config selfvoting toggle'
    ];
    this.aliases = ['selfVote'];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis', 'embedLinks'];

    this.#values = ['true', 'false', 'toggle'];
  }

  public async runPreconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    if (ctx.args.get(0) && !this.#values.includes(ctx.args.get(0).toLowerCase()))
      return MessageUtils.error(this.client, ctx.message,
        `Please provide one of the following arguments: \`${this.#values.join(', ')}\``);

    next();
  }

  public async run(ctx: CommandContext): Promise<any> {
    try {
      const docsRef = `${this.client.config.docs}/docs/configuration.html`;
      const currentStatus = ctx.settings!.selfVoting;
      const viewStatus = (status: boolean): string => status ? 'enabled' : 'disabled';

      const baseEmbed = MessageUtils.defaultEmbed()
        .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
        .setFooter(`Guild: ${ctx.guild!.id}`)
        .setTimestamp();

      if (!ctx.args.get(0)) {
        baseEmbed.setDescription(`Self voting on suggestions is **${viewStatus(currentStatus)}** in this guild.`);
        baseEmbed.addField('More Information', `[Link](${docsRef}#selfVoting)`);
        return ctx.embed(baseEmbed);
      }

      const userInput = ctx.args.get(0).toLowerCase();
      const status = userInput === 'true' ? true : userInput === 'toggle' ? !currentStatus : false;
      const guildData = await ctx.getSettings(false)!;
      guildData.setSelfVoting(status);
      await guildData.save();
      baseEmbed.setDescription(`Self voting on suggestions has been **${viewStatus(status)}** in this guild.`);
      await ctx.embed(baseEmbed);
    } catch (error) {
      Logger.error(error.stack);
      return MessageUtils.error(this.client, ctx.message, error.message, true);
    }
  }

  public async runPostconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    if (ctx.args.get(0)) await this.client.redis.helpers.clearCachedGuild(ctx.guild!.id);
    next();
  }
}
