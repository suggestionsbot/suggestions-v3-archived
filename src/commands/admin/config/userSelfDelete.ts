import SubCommand from '../../../structures/core/SubCommand';
import MessageUtils from '../../../utils/MessageUtils';
import CommandContext from '../../../structures/commands/Context';
import SuggestionsClient from '../../../structures/core/Client';
import { CommandNextFunction } from '../../../types';
import Logger from '../../../utils/Logger';
import { CONFIG_OPTIONS, TRUTHY_CONFIG_OPTIONS } from '../../../utils/Constants';

export default class ConfigUserSelfDeleteCommand extends SubCommand {
  constructor(client: SuggestionsClient) {
    super(client);

    this.parent = 'config';
    this.arg = 'userSelfDelete';
    this.name = 'userSelfDelete';
    this.friendly = 'config userSelfDelete';
    this.description = 'Configure if users should be allowed to delete their own suggestions.';
    this.usages = [
      'config userSelfDelete [true|on|false|off|toggle]',
      'config userSelfDelete [true|on|false|off|toggle]'
    ];
    this.examples = [
      'config userSelfDelete true',
      'config userSelfDelete false',
      'config selfDelete on',
      'config selfDelete toggle'
    ];
    this.aliases = ['selfDelete'];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis', 'embedLinks'];
  }

  runPreconditions(ctx: CommandContext, next: CommandNextFunction): any {
    if (ctx.args.get(0) && !CONFIG_OPTIONS.includes(ctx.args.get(0).toLowerCase()))
      return MessageUtils.error(this.client, ctx.message,
        `Please provide one of the following arguments: \`${CONFIG_OPTIONS.join(', ')}\``);

    next();
  }

  async run(ctx: CommandContext): Promise<any> {
    try {
      const docsRef = `${this.client.config.docs}/docs/configuration.html`;
      const currentStatus = ctx.settings!.userSelfDelete;
      const viewStatus = (status: boolean): string => status ? 'allowed' : 'not allowed';

      const baseEmbed = MessageUtils.defaultEmbed()
        .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
        .setFooter(`Guild: ${ctx.guild!.id}`)
        .setTimestamp();

      if (!ctx.args.get(0)) {
        baseEmbed.setDescription(`Users are currently **${viewStatus(currentStatus)}** to delete their own suggestions`);
        baseEmbed.addField('More Information', `[Link](${docsRef}#userSelfDelete)`);
        return ctx.embed(baseEmbed);
      }

      const userInput = ctx.args.get(0).toLowerCase();
      const status = TRUTHY_CONFIG_OPTIONS.includes(userInput) ? true : userInput === 'toggle' ? !currentStatus : false;
      const guildData = await ctx.getSettings(false)!;
      guildData.setSelfDelete(status);
      await guildData.save();
      return MessageUtils.success(this.client, ctx.message,
        `Users are now **${viewStatus(status)}** to delete their own suggestions.`);
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
