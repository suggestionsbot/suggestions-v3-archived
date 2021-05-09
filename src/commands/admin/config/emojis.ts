import { oneLine, stripIndents } from 'common-tags';

import SubCommand from '../../../structures/core/SubCommand';
import SuggestionsClient from '../../../structures/core/Client';
import { CommandCategory, CommandNextFunction, VoteEmoji } from '../../../types';
import CommandContext from '../../../structures/commands/Context';
import MessageUtils from '../../../utils/MessageUtils';
import emojis from '../../../utils/Emojis';
import Util from '../../../utils/Util';

/**
 * // TODO implement checks regarding premium, server booster and voting for the addition of custom emoji sets
 */
export default class ConfigEmojisCommand extends SubCommand {
  constructor(client: SuggestionsClient) {
    super(client);

    this.parent = 'config';
    this.arg = 'emojis';
    this.name = 'config-emojis';
    this.category = CommandCategory.ADMIN;
    this.description = 'Update the guild\'s vote emoji sets.';
    this.aliases = ['voteemojis'];
    this.examples = [
      'config emojis [add/remove] <emoji1>, <emoji2> [ ,[emoji3] ]',
      'config emojis reset',
      'config emojis default <id>'
    ];
    this.usages = [
      'config emojis default 2',
      'config emojis add :upvote:, :unsure:, :downvote:',
      'config emojis add :+1:, :-1:',
      'config emojis remove 7',
    ];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis', 'embedLinks'];
  }

  async runPreconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    const allEmojis = [...emojis, ...ctx.settings!.emojis];

    if (!ctx.args.get(0) && !allEmojis.length)
      return MessageUtils.error(this.client, ctx.message,'There are no vote emojis to dispay!');

    if (ctx.args.get(0) && ['add', 'remove', 'reset', 'default'].includes(ctx.args.get(0).toLowerCase())) {
      const arg = ctx.args.get(0).toLowerCase();

      switch (arg) {
        case 'add': {
          const emojiArgs = ctx.args.slice(1).join(' ').split(', ');
          if (!emojiArgs || ![2, 3].includes(emojiArgs.length)) return MessageUtils.error(this.client, ctx.message,
            'Please supply 2 or 3 emojis that are **comma-separated**! (`emoji1, emoji2`)');
          const invalidEmojis: Array<string> = [];
          for (const str of emojiArgs) {
            const guildEmoji = Util.parseEmoji(str.trim());
            const emojiMatch = Util.matchUnicodeEmoji(str.trim());
            if ((guildEmoji && guildEmoji.id) && ctx.guild!.emojis.find(e => e.id ===guildEmoji.id)) continue;
            if (emojiMatch && emojiMatch[0]) continue;
            invalidEmojis.push(str.trim());
          }

          if (invalidEmojis.length > 0) return MessageUtils.error(this.client, ctx.message,
            `I could not find these emojis: \`${invalidEmojis.join(', ')}\``);

          break;
        }
        case 'remove': case 'default': {
          const subArg = ctx.args.get(1);
          if (!allEmojis[+subArg]) return MessageUtils.error(this.client, ctx.message,
            `\`${subArg}\` is out of range. Please do \`${ctx.prefix + this.friendly}\` to see the options.`);
          if ((arg === 'remove') && (allEmojis[+subArg].system)) {
            const emojiView = await this.client.getVoteEmojisView(ctx.settings!, +subArg) as string;
            return MessageUtils.error(this.client, ctx.message,
              `${emojiView} is a system emoji set and cannot be removed!`);
          }

          break;
        }
        case 'reset': {
          if (!ctx.settings!.emojis.length) return MessageUtils.error(this.client, ctx.message,
            'There are no custom emoji sets to clear!');

          break;
        }
      }
    }

    next();
  }

  async run(ctx: CommandContext): Promise<any> {
    const docsRef = `${this.client.config.docs}/docs/configuration.html`;
    const voteEmojis = [...emojis, ...ctx.settings!.emojis];

    const baseEmbed = MessageUtils.defaultEmbed()
      .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
      .setFooter(`Guild: ${ctx.guild!.id}`)
      .setTimestamp();

    if ([0, 1].includes(ctx.args.args.length)) {
      const mainView = <Array<string>>await this.client.getVoteEmojisView(ctx.settings!);

      const configChannels = <SubCommand>this.client.subCommands.getCommand('config-channels');
      const premiumNotice = `You can do \`${ctx.prefix + configChannels.friendly} <channel> emojis <id>\` to override the default emoji set for a *specific* channel.`;
      baseEmbed.addField('Voting Emojis', stripIndents`
        Choose a default emoji set from the **${mainView.length}** sets below and see which sets you can use in your channels.
        
        ${mainView.join('\n\n')}
        
        You can do \`${ctx.prefix + this.friendly} default <id>\` to set the default emoji set for *all* channels.
        ${ctx.settings!.premium ? premiumNotice : ''}
      `);
      baseEmbed.addField('More Information', `[Link](${docsRef}#vote-emojis)`);

      return ctx.embed(baseEmbed);
    }

    if (ctx.args.get(0) && ['add', 'remove', 'reset', 'default'].includes(ctx.args.get(0).toLowerCase())) {
      const arg = ctx.args.get(0).toLowerCase();

      switch (arg) {
        case 'add': {
          const data = await ctx.getSettings()!;
          const emojiArgs = ctx.args.slice(1).join(' ').split(', ');
          const emojis = emojiArgs.map(arg => {
            const emojiMatch = Util.matchUnicodeEmoji(arg);
            const guildEmojiMatch = Util.parseEmoji(arg.trim());
            if (emojiMatch) return emojiMatch[0]!;
            if (Util.parseEmoji(arg.trim())!) return guildEmojiMatch!;
          });
          const emojiView = emojis.map(e => {
            if (typeof e === 'object') {
              if (e!.animated) return `<a:${e.name}:${e.id}`;
              else return `<:${e.name}:${e.id}>`;
            }

            return e;
          });

          const newSet = <VoteEmoji>{
            index: voteEmojis.length + 1,
            emojis: emojis.map(e => typeof e === 'object' ? e.id : e),
            addedBy: ctx.sender.id,
          };

          data.updateEmojis(newSet);

          await data.save();
          const document = await data.save();
          const updated = document.emojis.find(e => e.index === newSet.index);

          await MessageUtils.success(this.client, ctx.message, oneLine`${ctx.sender.mention} has successfully 
            ${updated ? 'added' : 'removed'} an emoji set: ${emojiView.join(' ')}`);

          break;
        }
        case 'remove': {
          const subArg = ctx.args.get(1);
          const set = voteEmojis[+subArg];
          const setView = <string>await this.client.getVoteEmojisView(ctx.settings!, +subArg);

          const data = await ctx.getSettings()!;
          data.updateEmojis(set);
          const document = await data.save();
          const updated = document.emojis.find(e => e.index === +subArg);

          await MessageUtils.success(this.client, ctx.message, oneLine`${ctx.sender.mention} has successfully 
            ${updated ? 'addded' : 'removed'} an emoji set: ${setView}`);

          break;
        }
        case 'default': {
          const subArg = ctx.args.get(1);
          const setView = <string>await this.client.getVoteEmojisView(ctx.settings!, +subArg);

          const data = await ctx.getSettings()!;
          data.setDefaultEmojis(+subArg);
          await data.save();

          await MessageUtils.success(this.client, ctx.message, oneLine`${ctx.sender.mention} has successfully set the
            default emoji set: ${setView}`);

          break;
        }
        case 'reset': {
          const data = await ctx.getSettings()!;
          data.emojis = [];
          await data.save();

          await MessageUtils.success(this.client, ctx.message, `${ctx.sender.mention} has successfully cleared
            the custom emojis sets for **${ctx.guild!.name}**!`);

          break;
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
