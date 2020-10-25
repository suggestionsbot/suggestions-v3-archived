import { stripIndents } from 'common-tags';
import * as crypto from 'crypto';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
dayjs.extend(duration);

import Command from '../../structures/Command';
import SuggestionsClient from '../../structures/Client';
import Context from '../../structures/Context';
import { CommandCategory, CommandNextFunction, SuggestionChannelType, SuggestionType } from '../../types';
import MessageUtils from '../../utils/MessageUtils';
import Util from '../../utils/Util';
import Logger from '../../utils/Logger';
import emojis from '../../utils/Emojis';
import { Emoji } from 'eris';

export default class SuggestCommand extends Command {
  constructor(public client: SuggestionsClient) {
    super(client);

    this.name = 'suggest';
    this.category = CommandCategory.SUGGESTIONS;
    this.description = 'Submit a new suggestion in a suggestion channel.';
    this.usages = [
      'suggest <suggestion>',
      'suggestion [channel] <suggestion>'
    ];
    this.examples = [
      'suggest can we add more colorful roles?',
      'suggest #video-ideas can you do a video on how to water cool?',
    ];
    this.throttles = {
      usages: 3,
      max: 5,
      duration: 60
    };
    this.botPermissions = ['manageMessages', 'embedLinks', 'addReactions', 'externalEmojis'];
    this.guarded = false;
    this.active = false;
  }

  async runPreconditions(ctx: Context, next: CommandNextFunction): Promise<any> {
    if (!ctx.args.get(0)) return MessageUtils.error(ctx.client, ctx.message,
      'Please provide text for this suggestion!');
    const channels = ctx.settings!.channels.map(c => c.channel);
    const channel = channels.length <= 1 ? channels[0] : ctx.args.get(0);
    const gChannel = Util.getChannel(channel, ctx.guild!);
    if (!gChannel && (channels.length > 1))
      return MessageUtils.error(this.client, ctx.message, `\`${ctx.args.get(0)}\` is not a valid channel!`);
    if (gChannel && (channels.length > 1) && !channels.includes(gChannel.id))
      return MessageUtils.error(this.client, ctx.message,stripIndents`${gChannel.mention} is not a valid suggestions channel!
        
        Valid channels: ${channels.map(c => `<#${c}>`).join(' ')}`);

    const sChannel = this.client.suggestionChannels.get(gChannel!.id);
    if (!sChannel) return MessageUtils.error(this.client, ctx.message,
      `Cannot post to ${gChannel!.mention} as it's not currently available!`);
    if (!this.client.isAdmin(ctx.member!)) {
      const cooldown = sChannel.cooldowns.get(ctx.sender.id);
      if (sChannel.cooldown && cooldown)
        return MessageUtils.error(this.client, ctx.message,
          `Cannot post to ${sChannel.channel.mention} for another 
              **${dayjs.duration(cooldown.expires - Date.now()).humanize()}** as you are in a cooldown!`);
      if (sChannel.type === SuggestionChannelType.STAFF && !this.client.isStaff(ctx.member!, ctx.settings!))
        return MessageUtils.error(this.client, ctx.message,
          `Cannot post to ${sChannel.channel.mention} as it is a staff suggestion channel!`);
      if (sChannel.locked) return MessageUtils.error(this.client, ctx.message,
        `Cannot post to ${sChannel.channel.mention} as it is currently locked!`);

      const isInAllowedRoles =  sChannel.allowed.some(r => ctx.member!.roles.includes(r.id));
      const isInBlockedRoles =  sChannel.blocked.some(r => ctx.member!.roles.includes(r.id));
      const allowed = (sChannel.allowed.size > 0) && isInAllowedRoles;
      const blocked = (sChannel.blocked.size > 0) && isInBlockedRoles;

      if (allowed) return next();
      if (blocked || (sChannel.data!.blocked[0].role === 'all'))
        return MessageUtils.error(this.client, ctx.message,
          `You cannot submit suggestions to ${sChannel.channel.mention} as you are in a blocked role!
          
          **Blocked:** ${sChannel.blocked.size > 1 ? sChannel.blocked.map(r => r.mention).join(' ') : 'All roles'}`);
      if ((sChannel.allowed.size > 0) && (!sChannel.allowed.some(r => ctx.member!.roles.includes(r.id))))
        return MessageUtils.error(this.client, ctx.message,
          `You cannot submit suggestions to ${sChannel.channel.mention} as you are not in an allowed role!
        
        **Allowed:** ${sChannel.allowed.map(r => r.mention).join(' ')}`);
    }
    if (![SuggestionChannelType.SUGGESTIONS, SuggestionChannelType.STAFF].includes(sChannel.type))
      return MessageUtils.error(this.client, ctx.message, `Suggestions cannot be posted in channels with
        the type: \`${sChannel.type}\`.`);

    next();
  }

  async run(ctx: Context): Promise<any> {
    const argCheck = Util.getChannel(ctx.args.get(0), ctx.guild!);
    const channels = ctx.settings!.channels.map(c => c.channel);
    const channel = Util.getChannel(channels.length <= 1 ? channels[0] : ctx.args.get(0), ctx.guild!)!;
    const sChannel = this.client.suggestionChannels.get(channel.id)!;

    const suggestion = argCheck ? ctx.args.slice(1).join(' ') : ctx.args.join(' ');

    const imageCheck = /(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)/.exec(suggestion);
    const id = crypto.randomBytes(20).toString('hex');
    const shortID = id.slice(33, 40);

    const embed = MessageUtils.defaultEmbed()
      .setDescription(stripIndents`
          **Submitter**
          ${Util.escapeMarkdown(Util.formatUserTag(ctx.sender))}

          **Suggestion**
          ${suggestion}
        `)
      .setThumbnail(ctx.sender.avatarURL)
      .setFooter(`User ID: ${ctx.sender.id} | sID: ${shortID}`)
      .setTimestamp();

    if (imageCheck) embed.setImage(imageCheck[0]);

    const dmEmbed = MessageUtils.defaultEmbed()
      .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
      .setDescription(stripIndents`Hey, ${ctx.sender.mention}. Your suggestion has been sent to the ${sChannel.channel.mention} to be voted on!

      Please wait until it gets approved or rejected by a staff member.

      Your suggestion ID (sID) for reference is **${shortID}**.
      `)
      .setFooter(`Guild ID: ${ctx.guild!.id} | sID: ${shortID}`)
      .setTimestamp();


    try {
      const setEmojis = [...emojis, ...ctx.settings!.emojis][ctx.settings!.defaultEmojis]!;
      const guild = setEmojis.system ? await this.client.base!.ipc.fetchGuild('737166408525283348') : ctx.guild!;
      const reactions = setEmojis.emojis.map(e => e && Util.matchUnicodeEmoji(e) ? e : guild.emojis.find(ge => ge.id === e));

      const submitted = await sChannel.channel.createMessage({ embed });

      for (const react of reactions) {
        if (react) await submitted.addReaction(typeof react !== 'string' ? Util.getReactionString(react)! : react);
      }

      // TODO dont forget to re-enable this when we implement (dm) responses
      // await ctx.dm({ user: ctx.sender, embed: dmEmbed });

      await sChannel.createSuggestion({
        user: ctx.sender.id,
        message: submitted.id,
        suggestion,
        id,
        type: SuggestionType.REGULAR
      });
      await MessageUtils.delete(ctx.message, { timeout: 5000 });
    } catch (e) {
      if (e.message === 'Missing Access') return;
      Logger.error(e);
      return MessageUtils.error(ctx.client, ctx.message, e.message, true);
    }
  }
}
