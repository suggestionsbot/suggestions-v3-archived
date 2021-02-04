import SubCommand from '../../../structures/core/SubCommand';
import CommandContext from '../../../structures/commands/Context';
import SuggestionsClient from '../../../structures/core/Client';
import { CommandCategory, CommandNextFunction, locales, Locales } from '../../../types';
import MessageUtils from '../../../utils/MessageUtils';
import Logger from '../../../utils/Logger';

export default class ConfigLocaleCommand extends SubCommand {
  constructor(client: SuggestionsClient) {
    super(client);

    this.parent = 'config';
    this.arg = 'locale';
    this.name = 'locale';
    this.friendly = 'config locale';
    this.category = CommandCategory.ADMIN;
    this.description = 'Set the default locale for the guild and its users.';
    this.usages = [
      'config locale [locale]',
      'config language [locale]',
    ];
    this.examples = [
      'config locale',
      'config locale fr_FR',
      'config language en_US'
    ];
    this.aliases = ['language'];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis', 'embedLinks'];
  }

  runPreconditions(ctx: CommandContext, next: CommandNextFunction): any {
    if (ctx.args.get(0) && !locales.includes(<Locales>ctx.args.get(0)))
      return MessageUtils.error(this.client, ctx.message,
        `Please provide one of the following locales: \`${locales.join(', ')}\``);
    if (ctx.args.get(0) && !this.client.locales.getLocale(<Locales>ctx.args.get(0)))
      return MessageUtils.error(this.client, ctx.message,
        `The locale file(s) for \`${ctx.args.get(0)}\` is not currently loaded. I can't update the configuration!`);

    next();
  }

  async run(ctx: CommandContext): Promise<any> {
    try {
      const docsRef = `${this.client.config.docs}/docs/configuration.html`;

      const baseEmbed = MessageUtils.defaultEmbed()
        .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
        .setFooter(`Guild: ${ctx.guild!.id}`)
        .setTimestamp();

      if (!ctx.args.get(0)) {
        baseEmbed.setDescription(`The guild's locale/language is currently set to **${ctx.settings.locale}**.`);
        baseEmbed.addField('More Information', `[Link](${docsRef}#locale)`);
        return ctx.embed(baseEmbed);
      }

      const userInput = <Locales>ctx.args.get(0);
      const guildData = await ctx.getSettings()!;
      guildData.setLocale(userInput);
      await guildData.save();
      return MessageUtils.success(this.client, ctx.message,
        `The guild's locale/language has been set to **${userInput}**.`);
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
