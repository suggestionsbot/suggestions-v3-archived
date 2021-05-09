import SubCommand from '../../../structures/core/SubCommand';
import CommandContext from '../../../structures/commands/Context';
import SuggestionsClient from '../../../structures/core/Client';
import { CommandCategory, CommandNextFunction, UserGuildProfile } from '../../../types';
import { CONFIG_OPTIONS, TRUTHY_CONFIG_OPTIONS, VIEW_STATUS } from '../../../utils/Constants';
import MessageUtils from '../../../utils/MessageUtils';
import Logger from '../../../utils/Logger';
import Util from '../../../utils/Util';

export default class ProfileAllowNicknamesCommand extends SubCommand {
  constructor(client: SuggestionsClient) {
    super(client);

    this.parent = 'profile';
    this.arg = 'allowNicknames';
    this.name = 'profile-allowNicknames';
    this.category = CommandCategory.GENERAL;
    this.description = 'Set if you want your nickname/displayname to be shown in suggestions.';
    this.usages = ['profile allowNicknames [true|on|false|off|toggle]'];
    this.examples = ['profile allowNicknames true'];
    this.aliases = ['allowNickname'];
    this.aliases = ['allowNickname'];
    this.botPermissions = ['manageMessages', 'externalEmojis', 'embedLinks'];
    this.guildOnly = false;
  }

  runPreconditions(ctx: CommandContext, next: CommandNextFunction): any {
    if (ctx.args.get(0) && !CONFIG_OPTIONS.includes(ctx.args.get(0).toLowerCase()))
      return MessageUtils.error(this.client, ctx.message,
        `Please provide one of the following arguments: \`${CONFIG_OPTIONS.join(', ')}\``);

    if (ctx.guild && ctx.args.get(0) && !ctx.settings.allowNicknames) return MessageUtils.error(this.client, ctx.message,
      `Displaying nicknames/displaynames are currently **disabled** in **${ctx.guild!.name}**.`);

    next();
  }

  async run(ctx: CommandContext): Promise<any> {
    try {
      const docsRef = `${this.client.config.docs}/docs/configuration.html`;
      const scope = ctx.guild ? `in **${ctx.guild.name}**` : '**globally**';
      const viewStatus = (status: boolean): string => VIEW_STATUS(status, ['not display', 'display']);

      const allowNicknames = Util.userCanDisplayNickname({
        client: this.client,
        guild: ctx.guild,
        settings: ctx.settings,
        profile: ctx.profile
      });

      const baseEmbed = MessageUtils.defaultEmbed()
        .setAuthor(ctx.guild ? ctx.guild.name : ctx.sender.tag, ctx.guild ? ctx.guild.iconURL : ctx.sender.avatarURL)
        .setFooter(`${ctx.guild ? 'Guild' : 'User'}: ${ctx.guild ? ctx.guild.id : ctx.sender.id}`)
        .setTimestamp();

      if (!ctx.args.get(0)) {
        baseEmbed.setDescription(`Suggestions will **${viewStatus(allowNicknames)}** your nickname/displayname ${scope}.`);
        baseEmbed.addField('More Information', `[Link](${docsRef}#allowNicknames)`);
        return ctx.embed(baseEmbed);
      }

      const userInput = ctx.args.get(0).toLowerCase();
      const status = TRUTHY_CONFIG_OPTIONS.includes(userInput) ? true : userInput === 'toggle' ? !allowNicknames : false;
      const userData = await ctx.getProfile();
      if (ctx.guild) {
        const data: Partial<UserGuildProfile> = { showNickname: status };
        const search = (p: UserGuildProfile): boolean => p.id === ctx.guild!.id;
        if (userData!.guilds.find(search)) userData!.updateGuildProfile(ctx.guild.id, data);
        else userData!.updateGuildProfiles(<UserGuildProfile>{ ...data, id: ctx.guild!.id });
      } else userData!.setShowNickname(status);
      await userData!.save();
      return MessageUtils.success(this.client, ctx.message,
        `Suggestions will **${viewStatus(status)}** your nickname/displayname ${scope}.`);
    } catch (error) {
      Logger.error(error.stack);
      return MessageUtils.error(this.client, ctx.message, error.message, true);
    }
  }
  async runPostconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    if (ctx.args.get(0)) await this.client.redis.helpers.clearCachedUser(ctx.sender.id);
    next();
  }
}
