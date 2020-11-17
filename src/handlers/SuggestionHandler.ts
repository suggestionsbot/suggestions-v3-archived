import { oneLine } from 'common-tags';
import dayjs from 'dayjs';

import SuggestionsClient from '../structures/Client';
import CommandContext from '../structures/Context';
import { SuggestionChannelType } from '../types';
import MessageUtils from '../utils/MessageUtils';
import Logger from '../utils/Logger';
import Suggestion from '../structures/Suggestion';

export default class SuggestionHandler {
  constructor(public client: SuggestionsClient) {}

  public async handle(ctx: CommandContext): Promise<any> {
    const sChannel = this.client.suggestionChannels.get(ctx.channel!.id)!;

    if (!this.client.isAdmin(ctx.member!)) {
      const cooldown = sChannel.cooldowns.get(ctx.sender.id);
      if (sChannel.cooldown && cooldown) {
        const msg = await MessageUtils.error(this.client, ctx.message, oneLine`Cannot post to ${sChannel.channel.mention} for 
          another **${dayjs.duration(cooldown.expires - Date.now()).humanize()}** as you are in a cooldown!`);

        return Promise.all([
          MessageUtils.delete(msg, { timeout: 3000 }),
          ctx.message.delete()
        ]);
      }
      if (sChannel.type === SuggestionChannelType.STAFF && !this.client.isStaff(ctx.member!, ctx.settings!)) {
        const msg = await  MessageUtils.error(this.client, ctx.message,
          `Cannot post to ${sChannel.channel.mention} as it is a staff suggestion channel!`);
        return Promise.all([
          MessageUtils.delete(msg, { timeout: 3000 }),
          ctx.message.delete()
        ]);
      }
      if (sChannel.locked) {
        const msg = await MessageUtils.error(this.client, ctx.message,
          `Cannot post to ${sChannel.channel.mention} as it is currently locked!`);
        return Promise.all([
          MessageUtils.delete(msg, { timeout: 3000 }),
          ctx.message.delete()
        ]);
      }

      const isInAllowedRoles =  sChannel.allowed.some(r => ctx.member!.roles.includes(r.id));
      const isInBlockedRoles =  sChannel.blocked.some(r => ctx.member!.roles.includes(r.id));
      const allowed = (sChannel.allowed.size > 0) && isInAllowedRoles;
      const blocked = (sChannel.blocked.size > 0) && isInBlockedRoles;

      if (allowed) return;
      if (blocked && (sChannel.data!.blocked[0].role === 'all')) {
        const msg = await MessageUtils.error(this.client, ctx.message,
          `You cannot submit suggestions to ${sChannel.channel.mention} as you are in a blocked role!
          
          **Blocked:** ${sChannel.blocked.size > 1 ? sChannel.blocked.map(r => r.mention).join(' ') : 'All roles'}`);
        return Promise.all([
          MessageUtils.delete(msg, { timeout: 3000 }),
          ctx.message.delete()
        ]);
      }
      if ((sChannel.allowed.size > 0) && (!sChannel.allowed.some(r => ctx.member!.roles.includes(r.id)))) {
        const msg = await  MessageUtils.error(this.client, ctx.message,
          `You cannot submit suggestions to ${sChannel.channel.mention} as you are not in an allowed role!
        
        **Allowed:** ${sChannel.allowed.map(r => r.mention).join(' ')}`);
        return Promise.all([
          MessageUtils.delete(msg, { timeout: 3000 }),
          ctx.message.delete()
        ]);
      }
    }

    if (![SuggestionChannelType.SUGGESTIONS, SuggestionChannelType.STAFF].includes(sChannel.type)) {
      const msg = await MessageUtils.error(this.client, ctx.message,
        `Suggestions cannot be posted in channels with the type: \`${sChannel.type}\`.`);
      return Promise.all([
        MessageUtils.delete(msg, { timeout: 3000 }),
        ctx.message.delete()
      ]);
    }

    try {
      new Suggestion(ctx, ctx.message.content, sChannel);
      await MessageUtils.delete(ctx.message, { timeout: 5000 });
    } catch (e) {
      if (e.message === 'Missing Access') return;
      Logger.error(e);
      return MessageUtils.error(ctx.client, ctx.message, e.message, true);
    }
  }
}
