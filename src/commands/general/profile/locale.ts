import SubCommand from '../../../structures/core/SubCommand';
import CommandContext from '../../../structures/commands/Context';
import SuggestionsClient from '../../../structures/core/Client';
import { CommandCategory, CommandNextFunction, Locales, locales, UserGuildProfile } from '../../../types';
import MessageUtils from '../../../utils/MessageUtils';
import Logger from '../../../utils/Logger';

export default class ProfileLocaleCommand extends SubCommand {
  constructor(client: SuggestionsClient) {
    super(client);

    this.parent = 'profile';
    this.arg = 'locale';
    this.name = 'profile-locale';
    this.friendly = 'profile locale';
    this.category = CommandCategory.GENERAL;
    this.description = 'Set your locale/language in a guild or globally.';
    this.usages = [
      'profile locale [locale]',
      'profile language [locale]',
    ];
    this.examples = [
      'profile locale',
      'profile locale fr_FR',
      'profile language en_US'
    ];
    this.aliases = ['language'];
    this.botPermissions = ['manageMessages', 'externalEmojis', 'embedLinks'];
    this.guildOnly = false;
  }

  runPreconditions(ctx: CommandContext, next: CommandNextFunction): any {
    if (ctx.args.get(0) && !locales.includes(<Locales>ctx.args.get(0)))
      return MessageUtils.error(this.client, ctx.message,
        `Please provide one of the following locales: \`${locales.join(', ')}\``);
    if (ctx.args.get(0) && !this.client.locales.getLocale(<Locales>ctx.args.get(0)))
      return MessageUtils.error(this.client, ctx.message,
        `The locale file(s) for \`${ctx.args.get(0)}\` are not currently loaded. I can't update your configuration!`);

    next();
  }

  async run(ctx: CommandContext): Promise<any> {
    try {
      const docsRef = `${this.client.config.docs}/docs/configuration.html`;
      const scope = ctx.guild ? `in **${ctx.guild.name}**` : '**globally**';

      const baseEmbed = MessageUtils.defaultEmbed()
        .setAuthor(ctx.guild ? ctx.guild.name : ctx.sender.tag, ctx.guild ? ctx.guild.iconURL : ctx.sender.avatarURL)
        .setFooter(`${ctx.guild ? 'Guild' : 'User'}: ${ctx.guild ? ctx.guild.id : ctx.sender.id}`)
        .setTimestamp();

      if (!ctx.args.get(0)) {
        baseEmbed.setDescription(`Your locale/language ${scope} is currently set to **${ctx.locale!.code}**.`);
        baseEmbed.addField('More Information', `[Link](${docsRef}#locale)`);
        return ctx.embed(baseEmbed);
      }

      const userInput = <Locales>ctx.args.get(0);
      const userData = await ctx.getProfile(true, ctx.guild?.id);
      if (ctx.guild) {
        const data: Partial<UserGuildProfile> = { locale: userInput };
        const search = (p: UserGuildProfile): boolean => p.id === ctx.guild!.id;
        if (userData!.guilds.find(search)) userData!.updateGuildProfile(ctx.guild.id, data);
        else userData!.updateGuildProfiles(<UserGuildProfile>{ ...data, id: ctx.guild!.id });
      } else userData!.setLocale(userInput);
      await userData!.save();

      return MessageUtils.success(this.client, ctx.message,
        `Your locale/language ${scope} has been set to **${userInput}** ${scope}.`);
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
