import Command from '../../structures/Command';
import SuggestionsClient from '../../structures/Client';
import Context from '../../structures/Context';
import { CommandNextFunction, SuggestionType } from '../../types';
import MessageUtils from '../../utils/MessageUtils';
import { stripIndents } from 'common-tags';
import * as crypto from 'crypto';
import Util from '../../utils/Util';
import { GuildTextableChannel } from 'eris';
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
    this.throttling = {
      usages: 3,
      duration: 60
    };
    this.botPermissions = ['manageMessages', 'embedLinks', 'addReactions', 'externalEmojis'];
    this.guarded = false;
    this.active = false;
  }

  async runPreconditions(ctx: Context, next: CommandNextFunction): Promise<any> {
    if (!ctx.args[0]) return MessageUtils.error(ctx.client, ctx.message, 'Please provide text for this suggestion!');
    next();
  }

  async run(ctx: Context): Promise<any> {
    const suggestion = ctx.args.join(' ');

    const imageCheck = /(http(s?):)([/|.|\w|\s|-])*\.(?:jpg|gif|png)/.exec(suggestion);
    const id = crypto.randomBytes(20).toString('hex');
    const shortID = id.slice(33, 40);

    const channel = <GuildTextableChannel>ctx.guild!.channels.get('737167291656962060');

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
      .setDescription(stripIndents`Hey, ${ctx.sender.mention}. Your suggestion has been sent to the ${channel.mention} to be voted on!
      
      Please wait until it gets approved or rejected by a staff member.
      
      Your suggestion ID (sID) for reference is **${shortID}**.
      `)
      .setFooter(`Guild ID: ${ctx.guild!.id} | sID: ${shortID}`)
      .setTimestamp();

    const emojis = ['✅', '❎'];

    const submitted = await channel.createMessage({ embed });

    for (const emoji of emojis) await submitted.addReaction(emoji);

    try {
      await ctx.dm({
        user: ctx.sender,
        embed: dmEmbed
      });
    } catch (e) {
      if (e.message === 'Missing Access') return;
    }

    try {
      await this.client.database.suggestionHelpers.createSuggestion({
        guild: ctx.guild!.id,
        user: ctx.sender.id,
        channel: channel.id,
        message: submitted.id,
        suggestion,
        id,
        type: SuggestionType.REGULAR
      });
      await MessageUtils.delete(ctx.message, { timeout: 5000 });
    } catch (e) {
      Logger.error(e);
      return MessageUtils.error(ctx.client, ctx.message, e.message, true);
    }
  }
}
