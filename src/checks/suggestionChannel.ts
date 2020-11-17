import { GuildTextableChannel } from 'eris';
import dayjs from 'dayjs';
import { oneLine, stripIndents } from 'common-tags';

import { SuggestionChannelType } from '../types';
import SuggestionsClient from '../structures/Client';
import CommandContext from '../structures/Context';
import Check from '../structures/Check';
import Util from '../utils/Util';

export default class SuggestionChannelCheck extends Check {

  constructor(client: SuggestionsClient, name: string) {
    super(client, name);

    this.name = 'suggestionChannel';
  }

  public async run(ctx: CommandContext): Promise<any> {
    if (!ctx.args.get(0)) throw new Error('Please provide text for this suggestion!');
    const channels = ctx.settings!.channels.map(c => c.channel);
    const channel = channels.length <= 1 ? channels[0] : ctx.args.get(0);
    const gChannel = ctx.message.prefix ? Util.getChannel(channel, ctx.guild!) : <GuildTextableChannel>ctx.channel;
    if (!gChannel && (channels.length > 1)) throw new Error(`\`${ctx.args.get(0)}\` is not a valid channel!`);
    if (gChannel && (channels.length > 1) && !channels.includes(gChannel.id))
      throw new Error(stripIndents`${gChannel.mention} is not a valid suggestions channel!
        
        Valid channels: ${channels.map(c => `<#${c}>`).join(' ')}`);

    const sChannel = this.client.suggestionChannels.get(gChannel!.id);
    if (!sChannel) throw new Error(`Cannot post to ${gChannel!.mention} as it's not currently available!`);

    if (!this.client.isAdmin(ctx.member!)) {
      const cooldown = sChannel.cooldowns.get(ctx.sender.id);
      if (sChannel.cooldown && cooldown)
        throw new Error(oneLine`Cannot post to ${sChannel.channel.mention} for another 
              **${dayjs.duration(cooldown.expires - Date.now()).humanize()}** as you are in a cooldown!`);
      if (sChannel.type === SuggestionChannelType.STAFF && !this.client.isStaff(ctx.member!, ctx.settings!))
        throw new Error(`Cannot post to ${sChannel.channel.mention} as it is a staff suggestion channel!`);
      if (sChannel.locked) throw new Error(`Cannot post to ${sChannel.channel.mention} as it is currently locked!`);

      const isInAllowedRoles =  sChannel.allowed.some(r => ctx.member!.roles.includes(r.id));
      const isInBlockedRoles =  sChannel.blocked.some(r => ctx.member!.roles.includes(r.id));
      const allowed = (sChannel.allowed.size > 0) && isInAllowedRoles;
      const blocked = (sChannel.blocked.size > 0) && isInBlockedRoles;

      if (allowed) return;
      if (blocked || (sChannel.data!.blocked[0].role === 'all'))
        throw new Error(`You cannot submit suggestions to ${sChannel.channel.mention} as you are in a blocked role!
          
          **Blocked:** ${sChannel.blocked.size > 1 ? sChannel.blocked.map(r => r.mention).join(' ') : 'All roles'}`);
      if ((sChannel.allowed.size > 0) && (!sChannel.allowed.some(r => ctx.member!.roles.includes(r.id))))
        throw new Error(`You cannot submit suggestions to ${sChannel.channel.mention} as you are not in an allowed role!
        
        **Allowed:** ${sChannel.allowed.map(r => r.mention).join(' ')}`);
    }
    if (![SuggestionChannelType.SUGGESTIONS, SuggestionChannelType.STAFF].includes(sChannel.type))
      throw new Error(`Suggestions cannot be posted in channels with the type: \`${sChannel.type}\`.`);
  }
}
