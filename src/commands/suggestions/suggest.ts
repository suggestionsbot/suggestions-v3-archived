import Command from '../../structures/Command';
import SuggestionsClient from '../../structures/Client';
import Context from '../../structures/Context';
import { CommandNextFunction, SuggestionChannelType, SuggestionType } from '../../types';
import MessageUtils from '../../utils/MessageUtils';
import { stripIndents } from 'common-tags';
import * as crypto from 'crypto';
import Util from '../../utils/Util';
import Logger from '../../utils/Logger';

export default class SuggestCommand extends Command {
  constructor(public client: SuggestionsClient) {
    super(client);

    this.name = 'suggest';
    this.category = 'suggestions';
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
    if (!ctx.args[0]) return MessageUtils.error(ctx.client, ctx.message, 'Please provide text for this suggestion!');
    const channels = ctx.settings!.channels.map(c => c.channel);
    const channel = channels.length <= 1 ? channels[0] : ctx.args[0];
    const gChannel = Util.getChannel(channel, ctx.guild!);
    if (!gChannel && (channels.length > 1))
      return MessageUtils.error(this.client, ctx.message, `\`${ctx.args[0]}\` is not a valid channel!`);
    if (gChannel && (channels.length > 1) && !channels.includes(gChannel.id))
      return MessageUtils.error(this.client, ctx.message,stripIndents`${gChannel.mention} is not a valid suggestions channel!
        
        Valid channels: ${channels.map(c => `<#${c}>`).join(' ')}
      `);

    const sChannel = this.client.suggestionChannels.get(gChannel!.id);
    if (!sChannel) return MessageUtils.error(this.client, ctx.message,
      `Cannot post to ${gChannel!.mention} as it's not currently available!`
    );
    if (!this.client.isAdmin(ctx.member!)) {
      if (sChannel.type === SuggestionChannelType.STAFF && !this.client.isStaff(ctx.member!, ctx.settings!))
        return MessageUtils.error(this.client, ctx.message,
          `Cannot post to ${sChannel.channel.mention} as it is a staff suggestion channel!`
        );
      if (sChannel.locked) return MessageUtils.error(this.client, ctx.message,
        `Cannot post to ${sChannel.channel.mention} as it is currently locked!`
      );
      if ((sChannel.blocked.size > 0) && sChannel.blocked.some(r => ctx.member!.roles.includes(r.id)))
        return MessageUtils.error(this.client, ctx.message,
          stripIndents`You cannot submit suggestions to ${sChannel.channel.mention} as you are in a blocked role!
          
          **Blocked:** ${sChannel.blocked.map(r => r.mention).join(' ')}`
        );
      if ((sChannel.allowed.size > 0) && (!sChannel.allowed.some(r => ctx.member!.roles.includes(r.id))))
        return MessageUtils.error(this.client, ctx.message,
          `You cannot submit suggestions to ${sChannel.channel.mention} as you are not in an allowed role!
        
        **Allowed:** ${sChannel.allowed.map(r => r.mention).join(' ')}`
        );
    }
    if (![SuggestionChannelType.SUGGESTIONS, SuggestionChannelType.STAFF].includes(sChannel.type))
      return MessageUtils.error(this.client, ctx.message, `Suggestions cannot be posted in channels with the type: \`${sChannel.type}\`.`);

    next();
  }

  async run(ctx: Context): Promise<any> {
    const argCheck = Util.getChannel(ctx.args[0], ctx.guild!);
    const channels = ctx.settings!.channels.map(c => c.channel);
    const channel = Util.getChannel(channels.length <= 1 ? channels[0] : ctx.args[0], ctx.guild!)!;
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

    const emojis = ['✅', '❎'];


    try {


      const submitted = await sChannel.channel.createMessage({ embed });

      for (const emoji of emojis) await submitted.addReaction(emoji);

      // await ctx.dm({
      //   user: ctx.sender,
      //   embed: dmEmbed
      // });

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
