import SubCommand from '../../../structures/core/SubCommand';
import MessageUtils from '../../../utils/MessageUtils';
import CommandContext from '../../../structures/commands/Context';
import SuggestionsClient from '../../../structures/core/Client';
import { CommandNextFunction } from '../../../types';
import Logger from '../../../utils/Logger';
import { CONFIG_OPTIONS, TRUTHY_CONFIG_OPTIONS, VIEW_STATUS } from '../../../utils/Constants';

export default class ConfigStaffCanEditCommand extends SubCommand {

  constructor(client: SuggestionsClient) {
    super(client);

    this.parent = 'config';
    this.arg = 'staffCanEdit';
    this.name = 'staffCanEdit';
    this.friendly = 'config staffCanEdit';
    this.description = 'Configure if staff should be able to delete suggestions they did\'t submit.';
    this.usages = [
      'config staffCanEdit [true|on|false|off|toggle]',
      'config staffCanEdit [true|on|false|off|toggle]'
    ];
    this.examples = [
      'config staffCanEdit true',
      'config staffCanEdit false',
      'config staffEdit on',
      'config staffEdit toggle'
    ];
    this.aliases = ['staffEdit'];
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
      const currentStatus = ctx.settings!.staffEdit;
      const viewStatus = (status: boolean): string => VIEW_STATUS(status, ['not allowed', 'allowed']);

      const baseEmbed = MessageUtils.defaultEmbed()
        .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
        .setFooter(`Guild: ${ctx.guild!.id}`)
        .setTimestamp();

      if (!ctx.args.get(0)) {
        baseEmbed.setDescription(`Staff are currently **${viewStatus(currentStatus)}** to edit suggestions they didn't submit`);
        baseEmbed.addField('More Information', `[Link](${docsRef}#staffCanEdit)`);
        return ctx.embed(baseEmbed);
      }

      const userInput = ctx.args.get(0).toLowerCase();
      const status = TRUTHY_CONFIG_OPTIONS.includes(userInput) ? true : userInput === 'toggle' ? !currentStatus : false;
      const guildData = await ctx.getSettings(false)!;
      guildData.setStaffDelete(status);
      await guildData.save();
      return MessageUtils.success(this.client, ctx.message,
        `Staff members are now **${viewStatus(status)}** to edit suggestions they didn't submit.`);
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
