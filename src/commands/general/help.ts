import { stripIndents } from 'common-tags';

import Command from '../../structures/core/Command';
import SuggestionsClient from '../../structures/core/Client';
import Context from '../../structures/commands/Context';
import MessageUtils from '../../utils/MessageUtils';
import { CommandCategory } from '../../types';

export default class HelpCommand extends Command {
  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'help';
    this.category = CommandCategory.GENERAL;
    this.description = 'View bot commands and where to receive bot support.';
    this.aliases = ['h', 'halp'];
    this.guildOnly = false;
    this.usages = [
      'help',
      'help [command/subcommand]'
    ];
    this.examples = [
      'help',
      'help config',
      'help config roles',
      'help approve'
    ];
    this.botPermissions = ['embedLinks'];
  }

  async run(ctx: Context): Promise<any> {
    const { colors: { main }, discord, website, docs, github } = this.client.config;
    const prefixes = this.client.getPrefixes(false, true, ctx.settings);
    const prefix = ctx.prefix;

    const cmds = this.client.commands;
    const categoryOptions = { namesOnly: true, formatted: true };

    const staffCheck = ctx.guild ? this.client.isGuildStaff(ctx.member!, ctx.settings!) : null;
    const adminCheck = ctx.guild ? this.client.isGuildAdmin(ctx.member!) : null;
    const supportCheck = await this.client.isSupport(ctx.sender).catch(e => new Error(e.message));
    const superSecretCheck = this.client.isSuperSecret(ctx.sender);
    const ownerCheck = this.client.isOwner(ctx.sender);

    const command = this.client.commands.getCommand(ctx.args.get(0), ...ctx.args.slice(1));
    if (command) {
      if ((command.category === CommandCategory.OWNER) && !ownerCheck) return;
      if ((command.category === CommandCategory.SECRET) && !superSecretCheck) return;
      const cmdName = 'friendly' in command ? command.friendly : command.name;
      const embed = MessageUtils.defaultEmbed()
        .setTitle(`${cmdName} | Help Information`)
        .setDescription(command.description)
        .addField('Category', `\`${command.category}\``, true)
        .setColor(main)
        .setFooter('<> = Required | [] = Optional')
        .setTimestamp();

      if (command.usages) {
        const usages = command.usages.map(usage => `\`${prefix + usage}\``);
        embed.addField('Usages', usages.join('\n'));
      }

      if (command.examples) {
        const examples = command.examples.map(example => `\`${prefix + example}\``);
        embed.addField('Examples', examples.join('\n'));
      }

      return ctx.embed(embed);
    }

    const embed = MessageUtils.defaultEmbed()
      .setTitle('Help Information')
      .setDescription(stripIndents`
        View help information for ${this.client.user.mention}.
        (Do \`${prefix + this.usages![0]}\` for command-specific information.)
      `)
      .setColor(main)
      .addField('📣 Current Prefixes', prefixes.join(' | '))
      .addField('🤖 General Commands', cmds.getCategory(CommandCategory.GENERAL, categoryOptions).join(' | '))
      .addField('🗳 Suggestion Commands', cmds.getCategory(CommandCategory.SUGGESTIONS, categoryOptions).join(' | '))
      .addField('ℹ Important Links', [
        `[Discord](${discord} "Get support and keep up-to-date with bot news!")`,
        `[Website](${website} "View our website!")`,
        `[Documentation](${docs} "Become a pro user and learn everything via the official docs!")`,
        `[GitHub](${github} "Contribute to the bot's codebase and see the tools we use!")`
      ].join(' | '))
      .addField('❗ Found an issue?', `Please report any issues directly to the **Support Team** via the Support Discord: ${discord}`);

    if ((ctx.guild! ? staffCheck : true) && (cmds.getCategory(CommandCategory.STAFF).length > 0)) {
      embed.fields.splice(2, 0, {
        name: '🏢 Staff Commands',
        value: cmds.getCategory(CommandCategory.STAFF, categoryOptions).join(' | '),
        inline: false
      });
    }

    if ((ctx.guild! ? adminCheck : true) && (cmds.getCategory(CommandCategory.ADMIN).length > 0)) {
      embed.fields.splice(3, 0, {
        name: '👔 Admin Commands',
        value: cmds.getCategory(CommandCategory.ADMIN, categoryOptions).join(' | '),
        inline: false
      });
    }

    if (supportCheck && (cmds.getCategory(CommandCategory.SUPPORT).length > 0)) {
      embed.fields.splice(4, 0, {
        name: '🤝 Support Commands',
        value: cmds.getCategory(CommandCategory.SUPPORT, categoryOptions).join(' | '),
        inline: false
      });
    }

    if (ownerCheck && (cmds.getCategory(CommandCategory.OWNER).length > 0)) {
      embed.fields.splice(embed.fields.indexOf(embed.fields[embed.fields.length - 2]), 0, {
        name: '🔒 Owner Commands',
        value: cmds.getCategory(CommandCategory.OWNER, categoryOptions).join(' | '),
        inline: false
      });
    }

    ctx.embed(embed);
  }
}
