import { GuildTextableChannel, PermissionOverwrite, Constants } from 'eris';
import Command from '../../structures/command';
import SuggestionsClient from '../../structures/client';
import { CommandNextFunction } from '../../types';
import Logger from '../../utils/Logger';
import MessageUtils from '../../utils/MessageUtils';
import CommandContext from '../../structures/Context';
import Util from '../../utils/Util';
import Context from '../../structures/Context';

const Permissions = Constants.Permissions;

export default class PermsCommand extends Command {
  constructor(public client: SuggestionsClient) {
    super(client);

    this.name = 'perms';
    this.category = 'admin';
    this.description = 'Debug the permissions of a channel to detect any issues (use by bot support staff).';
    this.guildOnly = true;
    this.guarded = true;
    this.adminOnly = true;
    this.botPermissions = ['embedLinks'];
  }

  async runPreconditions(ctx: Context, next: CommandNextFunction): Promise<any> {
    if (ctx.args[0]) {
      Logger.log(1);
      if (
        ctx.guild.channels.has(ctx.args[0]) ||
          ctx.guild.channels.find(c => c.name.toLowerCase() !== ctx.args[0].toLowerCase())
      ) {
        next();
      } else if (!ctx.args[0] && (ctx.message.channelMentions.length > 0)) {
        next();
      } else {
        return MessageUtils.error(ctx.client, ctx.message, `\`${ctx.args.join(' ')}\` does not resolve to a valid channel!`);
      }
    } else {
      next();
    }
  }

  public async run(ctx: CommandContext): Promise<any> {
    try {
      let channel: GuildTextableChannel = <GuildTextableChannel>ctx.channel;
      if (ctx.args[0] || (ctx.message.channelMentions.length > 0)) {
        channel = <GuildTextableChannel>ctx.guild.channels.get(ctx.args[0]) ||
            <GuildTextableChannel>ctx.guild.channels.get(ctx.message.channelMentions[0]) ||
            <GuildTextableChannel>ctx.guild.channels.find(c => c.name.toLowerCase() === ctx.args[0].toLowerCase());
      }

      let permissionOverwrites: PermissionOverwrite|Array<PermissionOverwrite>;
      const guildManagedRoles = ctx.guild.roles.filter(r => r.managed);
      const botManagedRoles = guildManagedRoles.filter(r => ctx.me.roles.includes(r.id));
      const botChannelPermissions = channel.permissionsOf(ctx.client.user.id);

      if (botManagedRoles && !ctx.me.roles)
        permissionOverwrites = channel.permissionOverwrites.get(botManagedRoles[0].id);
      if (botManagedRoles && ctx.me.roles)
        permissionOverwrites = channel.permissionOverwrites.filter(po => ctx.me.roles.includes(po.id));
      if (!botManagedRoles && ctx.me.roles)
        permissionOverwrites = channel.permissionOverwrites.filter(po => ctx.me.roles.includes(po.id));
      if (!botManagedRoles && !ctx.me.roles)
        permissionOverwrites = channel.permissionOverwrites.get(ctx.client.user.id);

      const finalChannelPermissions = permissionOverwrites instanceof Array ?
        Object.assign(botChannelPermissions.json, ...permissionOverwrites.map(po => po.json)) :
        Object.assign(botChannelPermissions.json, permissionOverwrites.json);

      const getObjectKeys = (obj: any): Array<string> => Object.keys(obj);
      const getObjectValues = (obj: any): Array<unknown> => Object.values(obj);

      const botPermKeys = Object.keys(ctx.me.permission.json);
      const botPermValues = Object.values(ctx.me.permission.json);

      const channelPerms = Object.keys(finalChannelPermissions)
        .sort((a, b) => Permissions[a] - Permissions[b])
        .reduce((acc, key) => {
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
        `Server Name:\n \`${ctx.guild.name}\``,
        `Server ID:\n \`${ctx.guild.id}\``
      ].join('\n'), true);
      embed.addField('User Information', [
        `Username:\n \`${Util.formatUserTag(ctx.sender)}\``,
        `User ID:\n \`${ctx.sender.id}\``,
        `Staff Member:\n \`${this.client.isStaff(ctx.member, ctx.settings) ? 'Yes' : 'No'}\``,
        `Server Admin:\n \`${this.client.isAdmin(ctx.member) ? 'Yes' : 'No'}\``
      ].join('\n'), true);
      embed.addField('Bot Information', [
        `Prefixes:\n ${ctx.client.getPrefixes(false, true, ctx.settings).join(', ')}`,
        `Shard:\n \`${ctx.shard.id}\``,
        `Cluster:\n \`${ctx.client.base.clusterID}\``,
        `API Latency: \n \`${Math.round(ctx.shard.latency)}\``
      ].join('\n'), true);
      embed.addField('\u200b', '\u200b', true);
      embed.setFooter('If this information was requested by a support team member, please send them this message link.');

      ctx.embed(embed);
    } catch (e) {
      Logger.error(`CMD:${this.name.toUpperCase()}`, e.stack);
      return MessageUtils.error(this.client, ctx.message, e.message);
    }
  }
}
