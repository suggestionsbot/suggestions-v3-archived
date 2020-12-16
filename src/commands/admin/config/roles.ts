import SuggestionsClient from '../../../structures/core/Client';
import SubCommand from '../../../structures/core/SubCommand';
import {
  CommandCategory,
  CommandNextFunction,
  GuildSchema,
  SuggestionRole
} from '../../../types';
import CommandContext from '../../../structures/commands/Context';
import Util from '../../../utils/Util';
import MessageUtils from '../../../utils/MessageUtils';
import Logger from '../../../utils/Logger';
import { oneLine } from 'common-tags';
import { Role } from 'eris';

export default class ConfigRolesCommand extends SubCommand {
  constructor(client: SuggestionsClient) {
    super(client);

    this.parent = 'config';
    this.arg = 'roles';
    this.name = 'config-roles';
    this.friendly = 'config roles';
    this.category = CommandCategory.ADMIN;
    this.description = 'Update the guild\'s staff roles';
    this.aliases = ['staffroles'];
    this.usages = [
      'config roles [add/remove] [role]',
      'config roles [reset]',
      'config roles [--update=<role>, <role>, ...]',
    ];
    this.examples = [
      'config roles add Admin',
      'config roles reset',
      'config roles remove Senior Moderator',
      'config roles --update=Owner, Moderator, Developer'
    ];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis', 'embedLinks'];
  }

  async runPreconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    const roles = ctx.settings!.staffRoles.map(r => r.role);

    if (!ctx.args.get(0) && !roles.length)
      return MessageUtils.error(this.client, ctx.message,'There are no staff roles to dispay!');

    if (ctx.args.get(0) && ['add', 'remove', 'reset'].includes(ctx.args.get(0).toLowerCase())) {
      const arg = ctx.args.get(0).toLowerCase();
      const role = ctx.args.get(1);
      const incorrectChannelArg = Util.getChannel(role, ctx.guild!);
      if (incorrectChannelArg) {
        const cmd = <SubCommand>this.client.subCommands.getCommand('config-channels');
        return MessageUtils.error(this.client, ctx.message, oneLine`You passed in a channel! 
          Did you mean to do \`${ctx.prefix + cmd.friendly} ${arg} #${incorrectChannelArg.name}\`?`);
      }
      const gRole = Util.getRole(role, ctx);
      if (!gRole) return MessageUtils.error(this.client, ctx.message,`\`${role}\` is not a valid role!`);
      if ((arg === 'remove') && !roles.includes(gRole.id))
        return MessageUtils.error(this.client, ctx.message, `${gRole.mention} is not a configured staff role!`);
      if (arg === 'add') {
        if (gRole.id === ctx.guild!.id) return MessageUtils.error(this.client, ctx.message,
          `${gRole.mention} is not a valid role to add!`);
        if (gRole.managed || (gRole.id === ctx.guild!.id)) return MessageUtils.error(this.client, ctx.message,
          `${gRole.mention} is a system/managed role, which cannot be added as a staff role!`);
        if (roles.includes(gRole.id)) return MessageUtils.error(this.client, ctx.message,
          `${gRole.mention} is already a configured staff role!`);
      }
      if ((arg === 'reset') && !roles.length)
        return MessageUtils.error(this.client, ctx.message, 'Cannot reset as there are no staff roles!');
    }

    const rolesToUpdate = ctx.flags.get('update');
    if (rolesToUpdate) {
      const missingRoles: Array<string> = [];
      const guardedRoles: Array<string> = [];
      (rolesToUpdate as string)
        .split(', ')
        .map(role => {
          const foundRole = Util.getRole(role, ctx);
          if (!foundRole) missingRoles.push(role);
          if (foundRole!.managed || (foundRole!.id === ctx.guild!.id)) guardedRoles.push(role);
          return foundRole;
        });

      let message = '';
      if (missingRoles.length > 0) message += `I could not find these role(s): \`${missingRoles.join(', ')}\`\n`;
      if (guardedRoles.length > 0) message += `I cannot add system/managed role(s): \`${guardedRoles.join(', ')}\`\n`;
      if (message.length > 0) return MessageUtils.error(this.client, ctx.message, message);
    }

    if (ctx.args.get(0) && Util.getRole(ctx.args.get(0), ctx)) {
      const role = Util.getRole(ctx.args.get(0), ctx);
      if (!role)  return MessageUtils.error(this.client, ctx.message,
        `\`${ctx.args.get(0)}\` is not a valid role!`);
      if (!roles.includes(role.id)) return MessageUtils.error(this.client, ctx.message,
        `${role.mention} is not a configured role!`);
    }

    next();
  }

  async run(ctx: CommandContext): Promise<any> {
    const roleExists = (data: GuildSchema, role: Role): boolean => data.staffRoles.map(r => r.role).includes(role.id);
    const docsRef = `${this.client.config.docs}/docs/configuration.html`;

    const baseEmbed = MessageUtils.defaultEmbed()
      .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
      .setFooter(`Guild: ${ctx.guild!.id}`)
      .setTimestamp();

    if ([0, 1].includes(ctx.args.args.length)) {
      const staffRoles = ctx.settings!.staffRoles.map(r => r.role);
      const roles = ctx.guild!.roles.filter(r => staffRoles.includes(r.id))
        .sort((a, b) => b.position - a.position)
        .map(r => r.mention)
        .join('\n');

      const admins = ctx.guild!.members.filter(m => this.client.isAdmin(m) && !m.user.bot)
        .map(m => m.mention)
        .join('\n');

      baseEmbed.setDescription(`Staff roles and admins for **${ctx.guild!.name}**.`)
        .addField('Admins', admins);

      if (staffRoles.length > 0) baseEmbed.addField('Staff Roles', roles);
      baseEmbed.addField('More Information', `[Link](${docsRef}#staff-roles)`);

      return ctx.embed(baseEmbed);
    }

    const data = await ctx.getSettings(false)!;
    const rolesToUpdate = ctx.flags.get('update');
    if (rolesToUpdate) {
      const roles = (rolesToUpdate as string).split(', ').map(role => Util.getRole(role, ctx)!);
      const adjustedRoles: Array<{ added: boolean, role: Role }> = [];
      try {
        for (const role of roles) {
          await data.updateStaffRoles(<SuggestionRole>{
            role: role.id,
            type: 'staff',
            addedBy: ctx.sender.id
          });

          adjustedRoles.push({ added: data.staffRoles.map(r => r.role).indexOf(role.id) !== -1, role });
        }

        await data.save();
        await MessageUtils.success(this.client, ctx.message,
          `${ctx.sender.mention} has successfully updated the staff roles for **${ctx.guild!.name}**: 
              
              ${adjustedRoles.map(r => `**${r.added ? '+' : '-'}**${r.role.name}`).join(', ')}`);
      } catch (e) {
        Logger.error('CONFIG ROLES', e.stack);
        return MessageUtils.error(this.client, ctx.message, e.message, true);
      }
    }

    if (ctx.args.get(0) && ['add', 'remove', 'reset'].includes(ctx.args.get(0).toLowerCase())) {
      const arg = ctx.args.get(0).toLowerCase();
      const role = ctx.args.get(1);
      const gRole = Util.getRole(role, ctx)!;

      switch (arg) {
        case 'add': case 'remove': {
          try {
            const data = await ctx.getSettings(false)!;
            const updated = <SuggestionRole>{
              role: gRole.id,
              type: 'staff',
              addedBy: ctx.sender.id
            };

            data.updateStaffRoles(updated);
            const document = await data.save();
            await MessageUtils.success(this.client, ctx.message,
              oneLine`${ctx.sender.mention} has successfully 
              ${roleExists(document, gRole) ? 'added' : 'removed'} ${gRole.mention} as 
                a **${updated.type}** role!`);
          } catch (e) {
            Logger.error('CONFIG ROLES', e.stack);
            return MessageUtils.error(this.client, ctx.message, e.message, true);
          }

          break;
        }
        case 'reset': {
          try {
            const data = await ctx.getSettings(false)!;
            data.staffRoles = [];
            await data.save();
            await MessageUtils.success(this.client, ctx.message,
              `${ctx.sender.mention} has successfully cleared all staff roles!`);
          } catch (e) {
            Logger.error('CONFIG ROLES', e.stack);
            return MessageUtils.error(this.client, ctx.message, e.message, true);
          }

          break;
        }
      }

      return;
    }
  }

  async runPostconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    // TODO make sure to implement checks so this only runs when an actual update method was used
    await this.client.redis.helpers.clearCachedGuild(ctx.guild!.id);

    next();
  }
}
