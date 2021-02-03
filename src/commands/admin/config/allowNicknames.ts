import SubCommand from '../../../structures/core/SubCommand';
import SuggestionsClient from '../../../structures/core/Client';
import CommandContext from '../../../structures/commands/Context';
import { CommandCategory, CommandNextFunction } from '../../../types';
import { CONFIG_OPTIONS, TRUTHY_CONFIG_OPTIONS, VIEW_STATUS } from '../../../utils/Constants';
import MessageUtils from '../../../utils/MessageUtils';
import Logger from '../../../utils/Logger';

export default class ConfigAllowNicknameCommand extends SubCommand {
  constructor(client: SuggestionsClient) {
    super(client);

    this.parent = 'config';
    this.arg = 'allowNicknames';
    this.name = 'allowNicknames';
    this.friendly = 'config allowNicknames';
    this.category = CommandCategory.ADMIN;
    this.description = 'Configure if a user\'s should have the option to display their nickname/displayname in suggestions.';
    this.usages = ['config allowNicknames [true|on|false|off|toggle]'];
    this.examples = ['config allowNicknames true'];
    this.aliases = ['allowNickname'];
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
      const currentStatus = ctx.settings!.allowNicknames;
      const viewStatus = (status: boolean): string => VIEW_STATUS(status, ['not allowed', 'allowed']);

      const baseEmbed = MessageUtils.defaultEmbed()
        .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
        .setFooter(`Guild: ${ctx.guild!.id}`)
        .setTimestamp();

      if (!ctx.args.get(0)) {
        baseEmbed.setDescription(`Users are currently **${viewStatus(currentStatus)}** to choose to display their nickname on suggestions`);
        baseEmbed.addField('More Information', `[Link](${docsRef}#allowNicknames)`);
        return ctx.embed(baseEmbed);
      }

      const userInput = ctx.args.get(0).toLowerCase();
      const status = TRUTHY_CONFIG_OPTIONS.includes(userInput) ? true : userInput === 'toggle' ? !currentStatus : false;
      const guildData = await ctx.getSettings()!;
      guildData.setAllowNicknames(status);
      await guildData.save();
      return MessageUtils.success(this.client, ctx.message,
        `Users are now **${viewStatus(status)}** to choose to display their nickname on suggestions.`);
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
