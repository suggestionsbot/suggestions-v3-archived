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
    this.arg = 'staffCanDelete';
    this.name = 'staffCanDelete';
    this.friendly = 'config staffCanDelete';
    this.description = 'Configure if staff should be able to delete suggestions they did\'t submit.';
    this.usages = [
      'config staffCanDelete [true|on|false|off|toggle]',
      'config staffCanDelete [true|on|false|off|toggle]'
    ];
    this.examples = [
      'config staffCanDelete true',
      'config staffCanDelete false',
      'config staffCanDelete ib',
      'config staffCanDelete toggle'
    ];
    this.aliases = ['staffDelete'];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis', 'embedLinks'];
  }

  public runPreconditions(ctx: CommandContext, next: CommandNextFunction): any {
    if (ctx.args.get(0) && !CONFIG_OPTIONS.includes(ctx.args.get(0).toLowerCase()))
      return MessageUtils.error(this.client, ctx.message,
        `Please provide one of the following arguments: \`${CONFIG_OPTIONS.join(', ')}\``);

    next();
  }

  public async run(ctx: CommandContext): Promise<any> {
    try {
      const docsRef = `${this.client.config.docs}/docs/configuration.html`;
      const currentStatus = ctx.settings!.staffDelete;
      const viewStatus = (status: boolean): string => status ? 'allowed' : 'not allowed';

      const baseEmbed = MessageUtils.defaultEmbed()
        .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
        .setFooter(`Guild: ${ctx.guild!.id}`)
        .setTimestamp();

      if (!ctx.args.get(0)) {
        baseEmbed.setDescription(`Staff are currently **${viewStatus(currentStatus)}** to delete suggestions they didn't submit`);
        baseEmbed.addField('More Information', `[Link](${docsRef}#staffCanDelete)`);
        return ctx.embed(baseEmbed);
      }

      const userInput = ctx.args.get(0).toLowerCase();
      const status = TRUTHY_CONFIG_OPTIONS.includes(userInput) ? true : userInput === 'toggle' ? !currentStatus : false;
      const guildData = await ctx.getSettings(false)!;
      guildData.setStaffDelete(status);
      await guildData.save();
      return MessageUtils.success(this.client, ctx.message,
        `Staff members are now **${viewStatus(status)}** to delete suggestions they didn't submit.`);
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
