import { Constants, GuildTextableChannel, PermissionOverwrite } from 'eris';
import { stripIndents } from 'common-tags';

import Command from '../../structures/core/Command';
import SuggestionsClient from '../../structures/core/Client';
import { CommandCategory, CommandNextFunction } from '../../types';
import Logger from '../../utils/Logger';
import MessageUtils from '../../utils/MessageUtils';
import CommandContext from '../../structures/commands/Context';
import Context from '../../structures/commands/Context';
import Util from '../../utils/Util';

const Permissions: { [key: string]: number } = Constants.Permissions;

export default class PermsCommand extends Command {
  constructor(public client: SuggestionsClient) {
    super(client);

    this.name = 'perms';
    this.category = CommandCategory.ADMIN;
    this.description = 'Debug the permissions of a channel to detect any issues (use by bot support staff).';
    this.guildOnly = true;
    this.guarded = true;
    this.adminOnly = true;
    this.botPermissions = ['embedLinks'];
  }

  async runPreconditions(ctx: Context, next: CommandNextFunction): Promise<any> {
    if (!Util.getChannel(ctx.args.get(0) || ctx.channel.id, ctx.guild!))
      return MessageUtils.error(ctx.client, ctx.message, `\`${ctx.args.get(0)}\` does not resolve to a valid channel!`);

    next();
  }

  public async run(ctx: CommandContext): Promise<any> {
    try {
      const channel = <GuildTextableChannel>Util.getChannel(ctx.args.get(0) || ctx.channel.id, ctx.guild!);

      let permissionOverwrites: PermissionOverwrite|Array<PermissionOverwrite>|undefined;
      const guildManagedRoles = ctx.guild!.roles.filter(r => r.managed);
      const botManagedRoles = guildManagedRoles.filter(r => ctx.me!.roles.includes(r.id));
      const botChannelPermissions = channel.permissionsOf(ctx.client.user.id);

      if (botManagedRoles && !ctx.me!.roles)
        permissionOverwrites = channel.permissionOverwrites.get(botManagedRoles[0].id);
      if (botManagedRoles && ctx.me!.roles)
        permissionOverwrites = channel.permissionOverwrites.filter(po => ctx.me!.roles.includes(po.id));
      if (!botManagedRoles && ctx.me!.roles)
        permissionOverwrites = channel.permissionOverwrites.filter(po => ctx.me!.roles.includes(po.id));
      if (!botManagedRoles && !ctx.me!.roles)
        permissionOverwrites = channel.permissionOverwrites.get(ctx.client.user.id);

      const finalChannelPermissions: { [x: string]: boolean } = permissionOverwrites instanceof Array ?
        Object.assign(botChannelPermissions.json, ...permissionOverwrites.map(po => po.json)) :
        Object.assign(botChannelPermissions.json, permissionOverwrites!.json);

      const getObjectKeys = (obj: any): Array<string> => Object.keys(obj);
      const getObjectValues = (obj: any): Array<unknown> => Object.values(obj);

      const botPermKeys = Object.keys(ctx.me!.permission.json);
      const botPermValues = Object.values(ctx.me!.permission.json);

      const channelPerms = Object.keys(finalChannelPermissions)
        .sort((a: string , b: string) => Permissions[a] - Permissions[b])
        .reduce((acc: { [x: string]: boolean }, key) => {
          acc[key] = finalChannelPermissions[key];
          return acc;
        }, {});

      const channelPermKeys = getObjectKeys(channelPerms);
      const channelPermValues = getObjectValues(channelPerms);

      const embed = MessageUtils.defaultEmbed();
      embed.addField('Bot Permissions', botPermKeys.map((k, i) => {
        return `${botPermValues[i] ? '✅' : '❌'} - ${Util.formatPermission(k)}`;
      }).join('\n'), true);
      embed.addField('Channel Permissions', channelPermKeys.map((k, i) => {
        return `${channelPermValues[i] ? '✅' : '❌'} - ${Util.formatPermission(k)}`;
      }).join('\n'), true);
      embed.addField('Server Information', [
        `Channel Name:\n \`${channel.name}\``,
        `Channel ID:\n \`${channel.id}\``,
        `Server Name:\n \`${ctx.guild!.name}\``,
        `Server ID:\n \`${ctx.guild!.id}\``
      ].join('\n'), true);
      embed.addField('User Information', [
        `Username:\n \`${Util.formatUserTag(ctx.sender)}\``,
        `User ID:\n \`${ctx.sender.id}\``,
        `Staff Member:\n \`${this.client.isStaff(ctx.member!, ctx.settings!) ? 'Yes' : 'No'}\``,
        `Server Admin:\n \`${this.client.isAdmin(ctx.member!) ? 'Yes' : 'No'}\``
      ].join('\n'), true);
      embed.addField('Bot Information', [
        `Prefixes:\n ${ctx.client.getPrefixes(false, true, ctx.settings).join(' | ')}`,
        `Shard:\n \`${ctx.shard!.id}\``,
        `Cluster:\n \`${ctx.client.base!.clusterID}\``,
        `API Latency:\n \`${Math.round(ctx.shard!.latency)}\``
      ].join('\n'), true);
      if (this.client.suggestionChannels.has(channel.id)) {
        const data = this.client.suggestionChannels.get(channel.id)!;
        const allowed = data.allowed.size > 0 ? data.allowed.map(r => r.mention).join(' ') : data.data!.blocked[0] && (data.data!.blocked[0].role === 'all') ? 'None' : 'All';
        const blocked = data.data!.blocked.length > 0 ? data.data!.blocked[0] && (data.data!.blocked[0].role === 'all') ?
          'All' : data.blocked.map(r => r.mention).join(' ') : 'None';
        // TODO Add emojis, cooldown, etc. Other useful information for myself and support staff to help resolve any sort of issues
        embed.addField('Suggestions', [
          `Type:\n \`${data.type}\``,
          stripIndents`Roles: 
           ✅ ${allowed}
           ❌ ${blocked}
          `,
          `Locked:\n \`${data.locked ? 'Yes' : 'No'}\``,
          `Review Mode:\n \`${data.reviewMode ? 'Enabled' : 'Disabled'}\``
        ].join('\n'), true);
      } else {
        embed.addField('\u200b', '\u200b', true);
      }

      embed.setFooter('If this information was requested by a support team member, please send them this message link.');

      ctx.embed(embed);
    } catch (e) {
      Logger.error(`CMD:${this.name.toUpperCase()}`, e.stack);
      return MessageUtils.error(this.client, ctx.message, e.message);
    }
  }
}
