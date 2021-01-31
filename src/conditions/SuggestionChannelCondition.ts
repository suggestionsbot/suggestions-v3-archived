import { GuildTextableChannel, TextChannel } from 'eris';
import dayjs from 'dayjs';
import { oneLine, stripIndents } from 'common-tags';

import { SuggestionChannelType } from '../types';
import SuggestionsClient from '../structures/core/Client';
import CommandContext from '../structures/commands/Context';
import Condition from '../structures/commands/Condition';
import Util from '../utils/Util';
import SuggestionChannel from '../structures/suggestions/SuggestionChannel';

export default class SuggestionChannelCondition extends Condition {

  constructor(client: SuggestionsClient, name: string) {
    super(client, name);

    this.name = 'suggestionChannel';
  }

  public async run(ctx: CommandContext): Promise<any> {
    const argCheck = Util.getChannel(ctx.args.get(0), ctx.guild!);
    const suggestion = argCheck ? ctx.args.slice(1).join(' ') : ctx.args.join(' ');
    if (!suggestion) throw new Error('Please provide text for this suggestion!');
    const channels = ctx.settings!.channels;
    const ids = channels.map(c => c.id);
    const channel = channels.length <= 1 ? channels[0].id : ctx.args.get(0);
    const gChannel = ctx.message.prefix ? Util.getChannel(channel, ctx.guild!) : <GuildTextableChannel>ctx.channel;
    if (!gChannel && (channels.length > 1)) throw new Error(`\`${ctx.args.get(0)}\` is not a valid channel!`);
    if (gChannel && (channels.length > 1) && !ids.includes(gChannel.id))
      throw new Error(stripIndents`${gChannel.mention} is not a valid suggestions channel!
        
        Valid channels: ${channels.map(c => `<#${c}>`).join(' ')}`);

    const docChannel = channels.find(c => c.id === gChannel!.id)!;
    let sChannel = <SuggestionChannel>this.client.suggestionChannels.get(gChannel!.id);
    if (!sChannel) {
      sChannel = <SuggestionChannel>await this.client.suggestionChannels
        .fetchChannel(ctx.guild!, gChannel!.id, docChannel.type);
    }
    if (sChannel && !sChannel.initialized) await sChannel.init();

    if (!this.client.isGuildAdmin(ctx.member!)) {
      const cooldown = sChannel.cooldowns.get(ctx.sender.id);
      if (sChannel.cooldown && cooldown)
        throw new Error(oneLine`Cannot post to ${sChannel.channel.mention} for another 
              **${dayjs.duration(cooldown.expires - Date.now()).humanize()}** as you are in a cooldown!`);
      if (sChannel.type === SuggestionChannelType.STAFF && !this.client.isGuildStaff(ctx.member!, ctx.settings!))
        throw new Error(`Cannot post to ${sChannel.channel.mention} as it is a staff suggestion channel!`);
      if (sChannel.locked) throw new Error(`Cannot post to ${sChannel.channel.mention} as it is currently locked!`);

      const allowedExists = sChannel.allowed.size > 0;
      const blockedExists = sChannel.blocked.size > 0;
      const isInAllowedRoles = allowedExists ? sChannel.allowed.some(r => ctx.member!.roles.includes(r.id)) : true;
      const isInBlockedRoles = blockedExists ? sChannel.blocked.some(r => ctx.member!.roles.includes(r.id)) : false;
      const allowed = allowedExists && isInAllowedRoles;
      const blocked = blockedExists && isInBlockedRoles;

      if (allowed) return;
      if (blocked || (blockedExists && (sChannel.data!.blocked[0].id === 'all')))
        throw new Error(`You cannot submit suggestions to ${sChannel.channel.mention} as you are in a blocked role!

          **Blocked:** ${sChannel.blocked.size > 1 ? sChannel.blocked.map(r => r.mention).join(' ') : 'All roles'}`);
      if (allowedExists && (!sChannel.allowed.some(r => ctx.member!.roles.includes(r.id))))
        throw new Error(`You cannot submit suggestions to ${sChannel.channel.mention} as you are not in an allowed role!

        **Allowed:** ${sChannel.allowed.map(r => r.mention).join(' ')}`);
    }
    if (![SuggestionChannelType.SUGGESTIONS, SuggestionChannelType.STAFF].includes(sChannel.type))
      throw new Error(`Suggestions cannot be posted in channels with the type: \`${sChannel.type}\`.`);
  }
}
