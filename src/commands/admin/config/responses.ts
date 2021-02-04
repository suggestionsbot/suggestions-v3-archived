import { stripIndents } from 'common-tags';

import SubCommand from '../../../structures/core/SubCommand';
import SuggestionsClient from '../../../structures/core/Client';
import CommandContext from '../../../structures/commands/Context';
import { CommandCategory, CommandNextFunction, RequiredResponseCommand } from '../../../types';
import MessageUtils from '../../../utils/MessageUtils';
import Logger from '../../../utils/Logger';
import { BULLET_POINT, CONFIG_OPTIONS, VIEW_STATUS } from '../../../utils/Constants';

export default class ConfigResponsesCommand extends SubCommand {
  #commands: Array<string>;
  #commandOptions: Array<string>;

  constructor(client: SuggestionsClient) {
    super(client);

    this.parent = 'config';
    this.arg = 'responses';
    this.name = 'respones';
    this.friendly = 'config responses';
    this.category = CommandCategory.ADMIN;
    this.description = 'Require a response for various commands or all commands.';
    this.usages = [
      'config responses [command|all|reset] [true|on|false|off|toggle]',
      'config reasons [command|all|reset]'
    ];
    this.examples = [
      'config responses approve toggle',
      'config reasons all off',
      'config responses delete true',
      'config responses reset'
    ];
    this.aliases = ['reasons'];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis', 'embedLinks'];

    this.#commands = ['approve', 'reject', 'consider', 'implement', 'delete', 'edit'];
    this.#commandOptions = ['approve', 'reject', 'consider', 'implement', 'delete', 'edit', 'all', 'none', 'reset'];
  }

  async runPreconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    if (ctx.args.get(0) && !this.#commandOptions.includes(ctx.args.get(0).toLowerCase()))
      return MessageUtils.error(this.client, ctx.message,
        `Please provide one of the following command options: \`${this.#commandOptions.join(', ')}\``);

    if (ctx.args.get(1) && !CONFIG_OPTIONS.includes(ctx.args.get(1).toLowerCase()))
      return MessageUtils.error(this.client, ctx.message,
        `Please provide one of the following arguments: \`${CONFIG_OPTIONS.join(', ')}\``);

    next();
  }

  async run(ctx: CommandContext): Promise<any> {
    try {
      const docsRef = `${this.client.config.docs}/docs/configuration.html`;
      const command = <RequiredResponseCommand>ctx.args.get(0);
      const status = ctx.args.get(1);
      const docResponses = ctx.settings!.requiredResponses || [];
      const required = (docResponses!.length === 1) && (docResponses[0] === 'all')
        ? 'all'
        : docResponses.isEmpty() ? 'none' : docResponses;
      const viewStatus = (status: boolean): string => VIEW_STATUS(status, ['not required', 'required']);
      const newStatus = (status: boolean): string => VIEW_STATUS(status, ['no longer required', 'now required']);

      const baseEmbed = MessageUtils.defaultEmbed()
        .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
        .addField('More Information', `[Link](${docsRef}#responses)`)
        .setFooter(`Guild: ${ctx.guild!.id}`)
        .setTimestamp();

      const affectedCommands = `*Affected commands:* ${this.#commands.map(c => `\`${c}\``).join(', ')}`;

      if (!command) {
        let view: string = '';
        if ((typeof required === 'string') && (required === 'all')) view = `**all commands.** \n\n${affectedCommands}`;
        if ((typeof required === 'string') && (required === 'none')) view = `**no commands.** \n\n${affectedCommands}`;
        if ((typeof required === 'object') && !required.isEmpty()) view = ` the following commands: \n${required
          .map(command => `**${BULLET_POINT} ${command}**`).join('\n')}`;

        baseEmbed.setDescription(stripIndents`Responses are required for ${view}`);
        return ctx.embed(baseEmbed);
      }

      if (command && ['none', 'reset'].includes(command)) {
        const guildData = await ctx.getSettings()!;
        guildData.updateRequiredResponses(command, true);
        await guildData.save();

        baseEmbed.setDescription('Responses are **no longer required** for **all commands**.');
        return ctx.embed(baseEmbed);
      }

      if (command && this.#commands.includes(command.toLowerCase()) && !status) {
        const cmd = <RequiredResponseCommand>command.toLowerCase();
        const ref = docResponses.includes(cmd);
        baseEmbed.setDescription(`Responses for \`${cmd}\` are **${viewStatus(ref)}**.`);
        return ctx.embed(baseEmbed);
      }

      const cmd = <RequiredResponseCommand>command.toLowerCase();
      const option = status.toLowerCase();
      const ref = docResponses.includes(cmd);

      const truthyValues = ['true', 'on'];
      const updateStatus = truthyValues.includes(option) ? true : option === 'toggle' ? !ref : false;
      const guildData = await ctx.getSettings()!;
      guildData.updateRequiredResponses(cmd, updateStatus);
      await guildData.save();

      let view: string;
      if (command === 'all') view = `Responses are **${newStatus(updateStatus)}** for **all commands**.\n\n${affectedCommands}`;
      else view = `Responses are **${newStatus(updateStatus)}** for \`${command}\`.`;

      baseEmbed.setDescription(view);
      return ctx.embed(baseEmbed);
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
