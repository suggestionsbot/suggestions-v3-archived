import SubCommand from '../../../structures/SubCommand';
import SuggestionsClient from '../../../structures/Client';
import {
  CommandCategory,
  CommandNextFunction,
  GuildSchema,
  SuggestionChannel,
  SuggestionChannelType, SuggestionRole
} from '../../../types';
import CommandContext from '../../../structures/Context';
import Util from '../../../utils/Util';
import MessageUtils from '../../../utils/MessageUtils';
import Logger from '../../../utils/Logger';
import { TextChannel } from 'eris';
import { oneLine, stripIndents } from 'common-tags';

export default class ConfigChannelsCommand extends SubCommand {
  #_channelArgOptions = ['lock', 'unlock', 'enable', 'disable', 'enablereview', 'disablereview', 'allowed', 'blocked', 'cooldown', 'emojis'];
  #_channelFlagOptions = ['allowed', 'blocked'];

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
      'config channels [channel] [[--]allowed/[--]blocked] [role(s)/all]',
      'config channels [channel] cooldown [cooldown]'
    ];
    this.examples = [
      'config channels add #suggestions',
      'config channels add #video-ideas suggestions',
      'config channels add #suggestion-logs logs',
      'config channels add #staff-votes staff',
      'config channels remove #staff-votes',
      'config channels #suggestions enable',
      'config channels #suggestions allowed all',
      'config channels #patron-ideas --allowed Donators, Patrons --blocked all',
      'config channels #video-ideas cooldown 1d'
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
      if (!gChannel) return MessageUtils.error(this.client, ctx.message, `\`${ctx.args.get(1)}\` is not a valid channel!`);
      if ((arg === 'remove') && !channels.includes(gChannel.id))
        return MessageUtils.error(this.client, ctx.message, `${gChannel.mention} is not a configured channel!`);
      if ((arg === 'add') && channels.includes(gChannel.id))
        return MessageUtils.error(this.client, ctx.message, `${gChannel.mention} is already a configured channel!`);
    }

    if (ctx.args.get(0) && Util.getChannel(ctx.args.get(0), ctx.guild!)) {
      const channel = Util.getChannel(ctx.args.get(0), ctx.guild!);
      if (!channel)  return MessageUtils.error(this.client, ctx.message, `\`${ctx.args.get(0)}\` is not a valid channel!`);
      if (!channels.includes(channel.id))
        return MessageUtils.error(this.client, ctx.message, `${channel.mention} is not a configured channel!`);
      const sChannel = this.client.suggestionChannels.get(channel.id);
      if (!sChannel) return MessageUtils.error(this.client, ctx.message,`${channel.mention} is not currently available!`);

      if (ctx.args.get(1) && (this.#_channelArgOptions.includes(ctx.args.get(1)))) {
        const arg = ctx.args.get(1).toLowerCase();

        switch (arg) {
          case 'enable': case 'unlock': {
            if (!sChannel.locked)
              return MessageUtils.error(this.client, ctx.message, `Cannot unlock ${channel.mention} as it's already unlocked!`);
            break;
          }
          case 'disable': case 'lock': {
            if (sChannel.locked)
              return MessageUtils.error(this.client, ctx.message, `Cannot lock ${channel.mention} as it's already locked!`);
            break;
          }
          case 'enablereview': {
            if (sChannel.reviewMode)
              return MessageUtils.error(this.client, ctx.message,
                `Cannot enable review mode for ${channel.mention} as it's already enabled!`);
            break;
          }
          case 'disablereview': {
            if (!sChannel.reviewMode)
              return MessageUtils.error(this.client, ctx.message,
                `Cannot disable review mode for ${channel.mention} as it's already disabled!`);
            break;
          }
          case 'allowed': case 'blocked': {
            if (!ctx.args.get(2) && (sChannel[arg].size < 1))
              return MessageUtils.error(this.client, ctx.message, `There are no ${arg} roles to display for ${channel.mention}!`);

            const incorrectArgIsRole = Util.getRole(ctx.args.get(2), ctx);
            if (incorrectArgIsRole)
              return MessageUtils.error(this.client, ctx.message,
                `You passed in a role! Did you mean to do \`${ctx.prefix + this.friendly} ${arg} add/remove @${incorrectArgIsRole.name}\`?`);

            if (ctx.args.args.length > 2) {
              const roles = sChannel[arg].map(r => r.id);
              const subArg = ctx.args.get(2).toLowerCase();
              const role = Util.getRole(ctx.args.slice(3).join(' '), ctx);
              if (!role) return MessageUtils.error(this.client, ctx.message,
                `The role \`${ctx.args.slice(3).join(' ')}\` does not exist!`);


              if (['add', 'remove'].includes(subArg)) {
                if (roles.includes(role.id))
                  return MessageUtils.error(this.client, ctx.message,
                    `${role.mention} is already a(n) ${arg} role in ${channel.mention}!`);
                if (!roles.includes(role.id))
                  return MessageUtils.error(this.client, ctx.message,
                    `${role.mention} is not a(n) ${arg} role in ${channel.mention}!`);
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
    const baseEmbed = MessageUtils.defaultEmbed()
      .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
      .setFooter(`Guild: ${ctx.guild!.id}`)
      .setTimestamp();


    if (ctx.args.get(0) && ['add', 'remove'].includes(ctx.args.get(0).toLowerCase())) {
      const arg = ctx.args.get(0).toLowerCase();
      const channelExists = (data: GuildSchema, channel: TextChannel): boolean => data.channels.map(c => c.channel).includes(channel.id);
      switch (arg) {
        case 'add': case 'remove': {
          try {
            const channel = ctx.args.get(1);
            const gChannel = Util.getChannel(channel, ctx.guild!)!;
            const data = await this.client.database.guildHelpers.getGuild(ctx.guild!, false);
            const updated = <SuggestionChannel>{
              channel: gChannel.id,
              type: SuggestionChannelType.SUGGESTIONS,
              addedBy: ctx.sender.id
            };

            data.updateChannels(updated);
            const document = await data.save();
            await MessageUtils.success(this.client, ctx.message,
              `${ctx.sender.mention} has successfully ${channelExists(document, gChannel) ? 'added' : 'removed'} ${gChannel.mention} as a(n) ${updated.type} channel!`);
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
      const docsRef = `${this.client.config.docs}/docs/configuration.html`;
      const channel = Util.getChannel(ctx.args.get(0), ctx.guild!)!;
      const sChannel = this.client.suggestionChannels.get(channel.id)!;

      if (ctx.args.get(1) && (this.#_channelArgOptions.includes(ctx.args.get(1)))) {
        const arg = ctx.args.get(1).toLowerCase();

        switch (arg) {
          case 'enable': case 'unlock': case 'disable': case 'lock': {
            try {
              const isDisabling = ['disable', 'lock'].includes(arg);
              const locked = await sChannel.lock(isDisabling);
              await MessageUtils.success(this.client, ctx.message,
                `${ctx.sender.mention} has successfully ${locked ? 'enabled' : 'disabled'} suggestion submissions in ${channel.mention}.`);
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
                `${ctx.sender.mention} has successfully ${enabled ? 'enabled' : 'disabled'} review mode for ${channel.mention}.`);
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

              baseEmbed.addField('Usages', `\`${this.usages!.slice(0, 3).map(u => ctx.prefix + u).join('\n')}\``, true);
              baseEmbed.addField('Examples', `\`${this.examples!.slice(0, 3).map(u => ctx.prefix + u).join('\n')}\``, true);
              baseEmbed.addField('More Information', `[Link](${docsRef}#channels)`);
              return ctx.embed(baseEmbed);
            }

            const subArg = ctx.args.get(2).toLowerCase();
            const role = Util.getRole(ctx.args.slice(3).join(' '), ctx)!;
            if (['add', 'remove'].includes(subArg)) {
              try {
                const updated = await sChannel.updateRole(<SuggestionRole>{
                  role: role.id,
                  type: arg,
                  addedBy: ctx.sender.id
                });
                return await MessageUtils.success(this.client, ctx.message,
                  oneLine`${ctx.sender.mention} has successfully ${updated ? 'added' : 'removed'} ${role.mention} as a(n)
                       ${arg} role in ${channel.mention}.`);
              } catch (e) {
                Logger.error('CONFIG CHANNEL', e.stack);
                return MessageUtils.error(this.client, ctx.message, e.message, true);
              }
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
}
