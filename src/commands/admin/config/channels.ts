import { Permission, Role, TextChannel } from 'eris';
import { oneLine, stripIndents } from 'common-tags';
import ms from 'ms';
import dayjs from 'dayjs';

import SuggestionsClient from '../../../structures/core/Client';
import {
  CommandCategory,
  CommandNextFunction,
  GuildSchema,
  SuggestionChannel as SuggestionChannelSchema,
  SuggestionChannelType,
  SuggestionRole
} from '../../../types';
import CommandContext from '../../../structures/commands/Context';
import SubCommand from '../../../structures/core/SubCommand';
import Util from '../../../utils/Util';
import MessageUtils from '../../../utils/MessageUtils';
import Logger from '../../../utils/Logger';
import emojis from '../../../utils/Emojis';
import SuggestionChannel from '../../../structures/suggestions/SuggestionChannel';

type ChannelType = 'regular' | 'staff' | 'logs' | 'modlogs';

/**
 * TODO implement premium guild checks for adding additional channels (limit is 2 channels)
 * TODO limit all logs channel to one channel type so there are no multiple/duplicate log channels
 */
export default class ConfigChannelsCommand extends SubCommand {
  #channelArgOptions = ['lock', 'unlock', 'enable', 'disable', 'enablereview', 'disablereview',
    'allowed', 'blocked', 'cooldown', 'emojis'];

  constructor(public client: SuggestionsClient) {
    super(client);

    this.parent = 'config';
    this.arg = 'channels';
    this.name = 'config-channels';
    this.friendly = 'config channels';
    this.category = CommandCategory.ADMIN;
    this.description = 'Update and view suggestion/log channels in the guild.';
    this.aliases = ['channel'];
    this.usages = [
      'config channels [add/remove] [channel]',
      'config channels [add/remove] [channel] [type]',
      'config channels [channel] [enable/unlock|disable/lock]',
      'config channels [channel] [allowed/blocked] [role]',
      'config channels [channel] [--allowed/--blocked=<role>, <role>, ...]',
      'config channels [channel] cooldown [cooldown]',
      'config channels [channel] emojis [name/id]',
      'config channels [channel] [enableReview/disableReview]'
    ];
    this.examples = [
      'config channels add #suggestions',
      'config channels add #video-ideas suggestions',
      'config channels add #suggestion-logs logs',
      'config channels add #staff-votes staff',
      'config channels remove #staff-votes',
      'config channels #suggestions enable',
      'config channels #suggestions allowed all',
      'config channels #suggestions allowed clear',
      'config channels #patron-ideas --allowed=Donators, Patrons --blocked=Members',
      'config channels #video-ideas emojis videoIdeaEmojis',
      'config channels #video-ideas cooldown 1d',
      'config channels #video-ideas enableReview'
    ];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis', 'embedLinks'];
  }

  async runPreconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    const channels = ctx.settings!.channels.map(c => c.channel);

    if (ctx.args.get(0) && ['add', 'remove'].includes(ctx.args.get(0).toLowerCase())) {
      const arg = ctx.args.get(0).toLowerCase();
      const channel = ctx.args.get(1);
      const gChannel = Util.getChannel(channel, ctx.guild!);
      const channelType = ctx.args.get(2);
      if (!gChannel) return MessageUtils.error(this.client, ctx.message,
        `\`${channel}\` is not a valid channel!`);
      if (channelType && !Object.values(SuggestionChannelType).includes(<SuggestionChannelType>channelType))
        return MessageUtils.error(this.client, ctx.message,
          `\`${channelType}\` is an invalid channel type:
            
            Valid types: \`${Object.values(SuggestionChannelType).join(', ')}\``);
      if ((arg === 'remove') && !channels.includes(gChannel.id))
        return MessageUtils.error(this.client, ctx.message, `${gChannel.mention} is not a configured channel!`);
      if (arg === 'add') {
        const defaultPermissions = new Permission(this.client.config.permissions[ConfigChannelsCommand._getPermsType(channelType)], 0);
        const missingPermissions = Util.getMissingPermissions(defaultPermissions, gChannel, ctx.me!);

        if (missingPermissions.length > 0)
          return MessageUtils.error(this.client, ctx.message, oneLine` I need the following permissions in 
            ${gChannel.mention} to be added: ${missingPermissions.map(p => `\`${p}\``).join(', ')}`);

        if (channels.includes(gChannel!.id))
          return MessageUtils.error(this.client, ctx.message, `${gChannel!.mention} is already a configured channel!`);
      }
    }

    if (ctx.args.get(0) && Util.getChannel(ctx.args.get(0), ctx.guild!)) {
      const channel = Util.getChannel(ctx.args.get(0), ctx.guild!);
      if (!channel)  return MessageUtils.error(this.client, ctx.message,
        `\`${ctx.args.get(0)}\` is not a valid channel!`);
      if (!channels.includes(channel.id)) return MessageUtils.error(this.client, ctx.message,
        `${channel.mention} is not a configured channel!`);
      const sChannel = <SuggestionChannel>this.client.suggestionChannels.get(channel.id);
      if (!sChannel) return MessageUtils.error(this.client, ctx.message,
        `${channel.mention} is not currently available!`);

      const allowedRoles = ctx.flags.get('allowed');
      if (allowedRoles) {
        if (sChannel.type !== SuggestionChannelType.SUGGESTIONS) return MessageUtils.error(this.client, ctx.message,
          'You can only adjust the allowed roles for regular suggestion channels!');
        const missingRoles: Array<string> = [];
        const guardedRoles: Array<string> = [];
        (allowedRoles as string)
          .split(', ')
          .map(role => {
            const foundRole = Util.getRole(role, ctx);
            if (!foundRole) return missingRoles.push(role);
            if (foundRole!.managed || (foundRole!.id === ctx.guild!.id)) return guardedRoles.push(foundRole!.name);
            return foundRole;
          });

        let message = '';
        if (missingRoles.length > 0) message += `I could not find these role(s): \`${missingRoles.join(', ')}\`\n`;
        if (guardedRoles.length > 0) message += `I cannot add system/managed role(s): \`${guardedRoles.join(', ')}\`\n`;
        if (message.length > 0) return MessageUtils.error(this.client, ctx.message, message);
      }

      const blockedRoles = ctx.flags.get('blocked');
      if (blockedRoles) {
        if (sChannel.type !== SuggestionChannelType.SUGGESTIONS) return MessageUtils.error(this.client, ctx.message,
          'You can only adjust the blocked roles for regular suggestion channels!');
        const missingRoles: Array<string> = [];
        const guardedRoles: Array<string> = [];
        (blockedRoles as string)
          .split(', ')
          .map(role => {
            const foundRole = Util.getRole(role, ctx);
            if (!foundRole) return missingRoles.push(role);
            if (foundRole!.managed || (foundRole!.id === ctx.guild!.id)) return guardedRoles.push(foundRole!.name);
            return foundRole;
          });

        let message = '';
        if (missingRoles.length > 0) message += `I could not find these role(s): \`${missingRoles.join(', ')}\`\n`;
        if (guardedRoles.length > 0) message += `I cannot add system/managed role(s): \`${guardedRoles.join(', ')}\`\n`;
        if (message.length > 0) return MessageUtils.error(this.client, ctx.message, message);

        if (missingRoles.length > 0) return MessageUtils.error(this.client, ctx.message,
          `I could not find these role(s): \`${missingRoles.join(', ')}\``);
      }

      if (ctx.args.get(1) && (this.#channelArgOptions.includes(ctx.args.get(1).toLowerCase()))) {
        const arg = ctx.args.get(1).toLowerCase();

        switch (arg) {
          case 'enable': case 'unlock': {
            if (!sChannel.locked)
              return MessageUtils.error(this.client, ctx.message,
                `Cannot unlock ${channel.mention} as it's already unlocked!`);
            break;
          }
          case 'disable': case 'lock': {
            if (sChannel.locked)
              return MessageUtils.error(this.client, ctx.message,
                `Cannot lock ${channel.mention} as it's already locked!`);
            break;
          }
          case 'enablereview': {
            if (sChannel.type !== SuggestionChannelType.SUGGESTIONS)
              return MessageUtils.error(this.client, ctx.message,
                'You can only enable review mode in a regular suggestion channel!');
            if (sChannel.reviewMode)
              return MessageUtils.error(this.client, ctx.message,
                `Cannot enable review mode for ${channel.mention} as it's already enabled!`);
            break;
          }
          case 'disablereview': {
            if (sChannel.type !== SuggestionChannelType.SUGGESTIONS)
              return MessageUtils.error(this.client, ctx.message,
                'You can only disable review mode in a regular suggestion channel!');
            if (!sChannel.reviewMode)
              return MessageUtils.error(this.client, ctx.message,
                `Cannot disable review mode for ${channel.mention} as it's already disabled!`);
            break;
          }
          case 'emojis': {
            const voteEmojis = [...emojis, ...ctx.settings!.emojis];
            const subArg = ctx.args.get(2);
            if (subArg && !voteEmojis[+subArg])
              return MessageUtils.error(this.client, ctx.message, `\`${subArg}\` is out of range.
                Please do \`${ctx.prefix + this.friendly} #${channel.name} emojis\` to see the options.`);
            if (subArg && (sChannel.emojis === +subArg)) {
              const setView = <string>await this.client.getVoteEmojisView(ctx.settings!, +subArg);
              return MessageUtils.error(this.client, ctx.message,
                `**${setView}** is already set as the emoji set for ${channel.mention}!`);
            }
            break;
          }
          case 'cooldown': {
            const subArg = ctx.args.get(2);
            if (!subArg && !sChannel.cooldown) return MessageUtils.error(this.client, ctx.message,
              `There is no cooldown to display for ${channel.mention}!`);
            if (subArg && (subArg.toLowerCase() === 'reset')) return next();
            if (subArg && !ms(subArg))
              return MessageUtils.error(this.client, ctx.message,
                `\`${subArg}\` is an invalid cooldown time! Please try again.`);
            if (subArg && (ms(subArg) > ms('12h')))
              return MessageUtils.error(this.client, ctx.message,
                'You cannot set a timeout greater than **12 hours**!');
            break;
          }
          case 'allowed': case 'blocked': {
            if (sChannel.type !== SuggestionChannelType.SUGGESTIONS)
              return MessageUtils.error(this.client, ctx.message,
                'You can only adjust the allowed/blocked roles for regular suggestion channels!');
            if (!ctx.args.get(2) && (sChannel[arg].size < 1))
              return MessageUtils.error(this.client, ctx.message,
                `There are no ${arg} roles to display for ${channel.mention}!`);

            const incorrectArgIsRole = Util.getRole(ctx.args.get(2), ctx);
            if (incorrectArgIsRole)
              return MessageUtils.error(this.client, ctx.message,
                oneLine`You passed in a role! Did you mean to do \`${ctx.prefix + this.friendly} ${channel.mention}
                    ${arg} add/remove @${incorrectArgIsRole.name}\`?`);

            if (ctx.args.args.length > 2) {
              const roles = sChannel[arg].map(r => r.id);
              const subArg = ctx.args.get(2).toLowerCase();
              const role = Util.getRole(ctx.args.slice(3).join(' '), ctx);
              if (subArg === 'all')  return MessageUtils.error(this.client, ctx.message,
                oneLine`You passed in \`all\`. Did you mean to do \`${ctx.prefix + this.friendly} #${channel.name}
                    ${arg} add/remove all\`?`);
              if (!role && ['add', 'remove'].includes(subArg) && (sChannel.data![arg][0] &&
                  (sChannel.data![arg][0].role === 'all') && roles.length === 0))
                return MessageUtils.error(this.client, ctx.message, oneLine`All roles are already **${arg}**
                  ${arg === 'allowed' ? 'in' : 'from'} ${channel.mention}`);

              if (!role && ['add', 'remove'].includes(subArg) && (ctx.args.get(3).toLowerCase() === 'all')) return next();
              if (!role && ['add', 'remove'].includes(subArg)) return MessageUtils.error(this.client, ctx.message,
                `The role \`${ctx.args.slice(3).join(' ')}\` does not exist!`);
              if (role && (role.managed || (role.id === ctx.guild!.id))) return MessageUtils.error(this.client,
                ctx.message, `${role.mention} is a system/managed role, which cannot be added as a(n) ${arg} role!`);

              if (['add', 'remove', 'reset', 'clear'].includes(subArg)) {
                if ((subArg === 'add') && roles.includes(role!.id))
                  return MessageUtils.error(this.client, ctx.message,
                    `${role!.mention} is already a(n) ${arg} role in ${channel.mention}!`);
                if ((subArg === 'remove') && !roles.includes(role!.id))
                  return MessageUtils.error(this.client, ctx.message,
                    `${role!.mention} is not a(n) ${arg} role in ${channel.mention}!`);
                if (['reset', 'clear'].includes(subArg) && roles.length < 0)
                  return MessageUtils.error(this.client, ctx.message,
                    `There are no ${arg} in ${channel.mention} to reset!`);
              }
            }

            break;
          }
        }
      }
    }

    next();
  }

  async run(ctx: CommandContext): Promise<any> {
    const docsRef = `${this.client.config.docs}/docs/configuration.html`;

    const baseEmbed = MessageUtils.defaultEmbed()
      .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
      .setFooter(`Guild: ${ctx.guild!.id}`)
      .setTimestamp();

    if (ctx.args.args.length === 1) {
      try {
        const channel = Util.getChannel(ctx.args.get(0), ctx.guild!)!;
        const sChannel = <SuggestionChannel>this.client.suggestionChannels.get(channel.id)!;

        const setView = <string>await this.client.getVoteEmojisView(ctx.settings!, sChannel.emojis);

        const allowed = sChannel.allowed.size > 0 ?
          sChannel.allowed.map(r => r.mention).join(' ') :
          sChannel.data!.blocked[0] && (sChannel.data!.blocked[0].role === 'all') ? 'None' : 'All';
        const blocked = sChannel.data!.blocked.length > 0 ? sChannel.data!.blocked[0] &&
        (sChannel.data!.blocked[0].role === 'all') ? 'All' : sChannel.blocked.map(r => r.mention).join(' ') : 'None';

        baseEmbed.setDescription(stripIndents`
          **Channel:** ${channel.mention}
          **Added:** ${dayjs(sChannel.data!.added).format('MM/DD/YYYY HH:mm:ss')}
          **Added By:** <@${sChannel.data!.addedBy}>
          **Channel Type:** ${Util.toProperCase(sChannel.type)}
          
          **Suggestion Cooldown:** ${sChannel?.cooldown ? ms(sChannel.cooldown, { long: true }) : 'N/A'}
          **Review Mode:** ${sChannel.reviewMode ? 'Enabled' : 'Disabled'}
          **Total Count:** ${sChannel.count}
          **Locked:** ${sChannel.locked ? 'Yes' : 'No'}
          **Emojis:** ${setView}
          
          **Allowed Roles:** ${allowed}
          **Blocked Roles:** ${blocked}
        `);
        baseEmbed.addField('More Information', `[Link](${docsRef}#channels)`);

        return ctx.embed(baseEmbed);
      } catch (e) {
        Logger.error('CONFIG CHANNEL', e.stack);
        return MessageUtils.error(this.client, ctx.message, e.message, true);
      }
    }

    if (ctx.args.get(0) && ['add', 'remove'].includes(ctx.args.get(0).toLowerCase())) {
      const arg = ctx.args.get(0).toLowerCase();
      const type = ctx.args.get(2);
      const channelExists = (data: GuildSchema, channel: TextChannel): boolean => data.channels
        .map(c => c.channel).includes(channel.id);
      switch (arg) {
        case 'add': case 'remove': {
          try {
            const channel = ctx.args.get(1);
            const gChannel = Util.getChannel(channel, ctx.guild!)!;
            const data = await this.client.database.helpers.guild.getGuild(ctx.guild!, false);
            const updated = <SuggestionChannelSchema>{
              channel: gChannel.id,
              type: type ? <SuggestionChannelType>type : SuggestionChannelType.SUGGESTIONS,
              addedBy: ctx.sender.id
            };

            data.updateChannels(updated);
            const document = await data.save();
            await MessageUtils.success(this.client, ctx.message,
              oneLine`${ctx.sender.mention} has successfully 
              ${channelExists(document, gChannel) ? 'added' : 'removed'} ${gChannel.mention} as 
                a(n) **${updated.type}** channel!`);
          } catch (e) {
            Logger.error('CONFIG CHANNEL', e.stack);
            return MessageUtils.error(this.client, ctx.message, e.message, true);
          }

          break;
        }
        default: return;
      }
    }

    if (ctx.args.get(0) && Util.getChannel(ctx.args.get(0), ctx.guild!)) {
      const channel = Util.getChannel(ctx.args.get(0), ctx.guild!)!;
      const sChannel = <SuggestionChannel>this.client.suggestionChannels.get(channel.id)!;

      const allowedRoles = ctx.flags.get('allowed');
      if (allowedRoles) {
        const roles = (allowedRoles as string)
          .split(', ')
          .map(role => Util.getRole(role, ctx)!);

        const adjustedRoles: Array<{ added: boolean, role: Role }> = [];
        try {
          for (const role of roles) {
            const updated = await sChannel.updateRole(<SuggestionRole>{
              role: role.id,
              type: 'allowed',
              addedBy: ctx.sender.id
            });

            adjustedRoles.push({ added: updated, role });
          }

          await MessageUtils.success(this.client, ctx.message,
            `${ctx.sender.mention} has successfully updated the **allowed** roles in ${channel.mention}: 
            
            ${adjustedRoles.map(r => `**${r.added ? '+' : '-'}**${r.role.name}`).join(', ')}`);
        } catch (e) {
          Logger.error('CONFIG CHANNEL', e.stack);
          return MessageUtils.error(this.client, ctx.message, e.message, true);
        }

        return;
      }

      const blockedRoles = ctx.flags.get('blocked');
      if (blockedRoles) {
        const roles = (blockedRoles as string)
          .split(', ')
          .map(role => Util.getRole(role, ctx)!);

        const adjustedRoles: Array<{ added: boolean, role: Role }> = [];
        try {
          for (const role of roles) {
            const updated = await sChannel.updateRole(<SuggestionRole>{
              role: role.id,
              type: 'blocked',
              addedBy: ctx.sender.id
            });

            adjustedRoles.push({ added: updated, role });
          }

          await MessageUtils.success(this.client, ctx.message,
            `${ctx.sender.mention} has successfully updated the **blocked** roles in ${channel.mention}:
            
            ${adjustedRoles.map(r => `**${r.added ? '+' : '-'}**${r.role.name}`).join(', ')}`);
        } catch (e) {
          Logger.error('CONFIG CHANNEL', e.stack);
          return MessageUtils.error(this.client, ctx.message, e.message, true);
        }

        return;
      }

      if (ctx.args.get(1) && (this.#channelArgOptions.includes(ctx.args.get(1).toLowerCase()))) {
        const arg = ctx.args.get(1).toLowerCase();

        switch (arg) {
          case 'enable': case 'unlock': case 'disable': case 'lock': {
            try {
              const isDisabling = ['disable', 'lock'].includes(arg);
              const locked = await sChannel.lock(isDisabling);
              await MessageUtils.success(this.client, ctx.message,
                oneLine`${ctx.sender.mention} has successfully ${locked ? 'disabled' : 'enabled'} suggestion
                 submissions in ${channel.mention}.`);
            } catch (e) {
              Logger.error('CONFIG CHANNEL', e.stack);
              return MessageUtils.error(this.client, ctx.message, e.message, true);
            }
            break;
          }
          case 'emojis': {
            try {
              if (ctx.args.get(2)) {
                const emojis = ctx.args.get(2).toLowerCase();
                const setView = <string>await this.client.getVoteEmojisView(ctx.settings!, +emojis);
                await sChannel.setEmojis(+emojis);
                await MessageUtils.success(this.client, ctx.message,
                  oneLine`${ctx.sender.mention} has successfully set **${setView}** as the emoji set
                   in **${channel.mention}**!`);
                return;
              }

              const mainView = <Array<string>>await this.client.getVoteEmojisView(ctx.settings!, null, sChannel);
              baseEmbed.addField('Channel Emojis', stripIndents`
                ${mainView.join('\n\n')}
                
                You can do \`${ctx.prefix + this.friendly} #${channel.name} emojis <id>\` to set the emoji set for this channel.
              `);
              baseEmbed.addField('More Information', `[Link](${docsRef}#channels)`);
              ctx.embed(baseEmbed);
            } catch (e) {
              Logger.error('CONFIG CHANNEL', e.stack);
              return MessageUtils.error(this.client, ctx.message, e.message, true);
            }
            break;
          }
          case 'cooldown': {
            try {
              if (ctx.args.get(2)) {
                const subArg = ctx.args.get(2);
                const cooldown = subArg.toLowerCase() === 'reset' ? 0 : ms(ctx.args.get(2));
                const setCooldown = await sChannel.setCooldown(cooldown);
                await MessageUtils.success(this.client, ctx.message,
                  oneLine`${ctx.sender.mention} has successfully ${setCooldown ? 'set' : 'reset'} the cooldown for ${channel.mention}
                    ${setCooldown ? `to **${ms(setCooldown, { long: true })}**!` : '!'}`);
                return;
              }
              baseEmbed.addField('Channel Cooldown', ms(sChannel.cooldown!, { long: true }));
              baseEmbed.addField('More Information', `[Link](${docsRef}#channels)`);
              ctx.embed(baseEmbed);
            } catch (e) {
              Logger.error('CONFIG CHANNEL', e.stack);
              return MessageUtils.error(this.client, ctx.message, e.message, true);
            }
            break;
          }
          case 'enablereview': case 'disablereview': {
            try {
              const enabled = await sChannel.setReviewMode(arg === 'enablereview');
              await MessageUtils.success(this.client, ctx.message,
                oneLine`${ctx.sender.mention} has successfully ${enabled ? 'enabled' : 'disabled'} 
                review mode for ${channel.mention}.`);
            } catch (e) {
              Logger.error('CONFIG CHANNEL', e.stack);
              return MessageUtils.error(this.client, ctx.message, e.message, true);
            }
            break;
          }
          case 'allowed': case 'blocked': {
            if (!ctx.args.get(2)) {
              let i = 1;
              baseEmbed.setDescription(stripIndents`${Util.toProperCase(arg)} roles in ${channel.mention}:
              
                ${sChannel[arg].map(r => `**${i++})** ${r.mention}`).join('\n')}
              `);
              baseEmbed.addField('More Information', `[Link](${docsRef}#channels)`);
              return ctx.embed(baseEmbed);
            }

            const subArg = ctx.args.get(2).toLowerCase();
            const role = Util.getRole(ctx.args.slice(3).join(' '), ctx)!;
            try {
              if (['reset', 'clear'].includes(subArg)) {
                await sChannel.clearRoles(arg, true);
                return MessageUtils.error(this.client, ctx.message,
                  `${ctx.sender.mention} has successfully cleared all **${arg}** roles in ${channel.mention}!`);
              }

              if (['add', 'remove'].includes(subArg)) {
                if (ctx.args.get(3).toLowerCase() === 'all') {
                  await sChannel.clearRoles(arg);
                  return await MessageUtils.success(this.client, ctx.message,
                    oneLine`${ctx.sender.mention} has successfully **${arg}** 
                      all roles ${arg === 'allowed' ? 'to submit suggesitons in' : 'from submitting suggestions in'} 
                      ${channel.mention}!`);
                } else {
                  const updated = await sChannel.updateRole(<SuggestionRole>{
                    role: role.id,
                    type: arg,
                    addedBy: ctx.sender.id
                  });
                  return await MessageUtils.success(this.client, ctx.message,
                    oneLine`${ctx.sender.mention} has successfully **${updated ? 'added' : 'removed'}** 
                      ${role.mention} as a(n) **${arg}** role in ${channel.mention}!`);
                }
              }
            } catch (e) {
              Logger.error('CONFIG CHANNEL', e.stack);
              return MessageUtils.error(this.client, ctx.message, e.message, true);
            }

            break;
          }
        }
      }
    }
  }

  async runPostconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    // TODO make sure to implement checks so this only runs when an actual update method was used
    await this.client.redis.helpers.clearCachedGuild(ctx.guild!.id);

    next();
  }

  private static _getPermsType(t: string): ChannelType {
    let returnedPerm: ChannelType = 'regular';
    switch (t) {
      case 'suggestions': return returnedPerm = 'regular';
      case 'staff': return returnedPerm = 'staff';
      case 'logs': case 'approved': case 'rejected': return returnedPerm = 'logs';
    }

    return returnedPerm;
  }
}
