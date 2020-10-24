import SubCommand from '../../../structures/SubCommand';
import SuggestionsClient from '../../../structures/Client';
import { CommandCategory, CommandNextFunction } from '../../../types';
import CommandContext from '../../../structures/Context';
import MessageUtils from '../../../utils/MessageUtils';
import emojis from '../../../utils/Emojis';
import { stripIndents } from 'common-tags';

/**
 * // TODO implement checks regarding premium, server booster and voting for the addition of custom emoji sets
 */
export default class ConfigEmojisCommand extends SubCommand {
  constructor(client: SuggestionsClient) {
    super(client);

    this.parent = 'config';
    this.arg = 'emojis';
    this.name = 'config-emojis';
    this.friendly = 'config emojis';
    this.category = CommandCategory.ADMIN;
    this.description = 'Update the guild\'s vote emoji sets.';
    this.aliases = ['voteemojis'];
    this.examples = [
      'config emojis [add/remove] <name> <emoji1> <emoji2> [emoji3]',
      'config emojis reset',
      'config emojis default <name>'
    ];
    this.usages = [
      'config emojis default thumbEmojis',
      'config emojis add :upvote:, :unsure:, :downvote:',
      'config emojis add :+1:, :-1:',
      'config emojis remove customEmojis1',
    ];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis', 'embedLinks'];
  }

  // async runPreconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
  //   const emojis = ctx.settings!.emojis.map(e => e.name);
  //
  //   if (!ctx.args.get(0) && !emojis.length)
  //     return MessageUtils.error(this.client, ctx.message,'There are no vote emojis to dispay!');
  //
  //   if (ctx.args.get(0) && ['add', 'remove', 'reset', 'default'].includes(ctx.args.get(0).toLowerCase())) {
  //     const arg = ctx.args.get(0).toLowerCase();
  //     const emojis = ctx.args.slice(1).join(' ').split(', ')
  //   }
  //
  //   next();
  // }

  async run(ctx: CommandContext): Promise<any> {
    const docsRef = `${this.client.config.docs}/docs/configuration.html`;
    const voteEmojis = ctx.settings!.emojis.find(e => e.default)?.name ?? 'defaultEmojis';

    const baseEmbed = MessageUtils.defaultEmbed()
      .setAuthor(ctx.guild!.name, ctx.guild!.iconURL)
      .setFooter(`Guild: ${ctx.guild!.id}`)
      .setTimestamp();


    const emojiSets = emojis.map(async set => {
      let emojiSet;

      if (set.custom) {
        emojiSet = set.emojis.map(async e => {
          return this.client.base!.ipc.fetchGuild('737166408525283348').then(g => {
            if (!g) throw new Error('GuildNotFound');
            const emoji = g.emojis.find(em => em.id === e);
            if (!emoji) throw new Error('EmojiNotFound');

            return `<:${emoji.name}:${emoji.id}>`;
          });
        });
      } else {
        emojiSet = set.emojis;
      }

      const emojiSetView = await Promise.all(emojiSet);

      if (voteEmojis === set.name) return `\`${set.id}\`: ${emojiSetView.join(' ')} ***(Currently Using)***`;
      else return `\`${set.id}\` ${emojiSetView.join(' ')}`;
    });

    const mainView = await Promise.all(emojiSets);

    const configChannels = <SubCommand>this.client.subCommands.getCommand('config-channels');
    const emojiCount = [0, 1].includes(ctx.settings!.emojis.length) ? emojis.length : emojis.length + (ctx.settings!.emojis.length - 1);
    // TODO currently, we're displaying IDs here. When setting actual vote emojis per channel, we take in a name. See how to incorporate names
    baseEmbed.addField('Voting Emojis', stripIndents`
      Choose a default emoji set from the **${emojiCount}** sets below and see which sets you can use in your channels.
      
      ${mainView.join('\n\n')}
      
      You can do \`${ctx.prefix + this.friendly} default <id>\` to set the default emoji set for *all* channels.
      You can do \`${ctx.prefix + configChannels.friendly} <channel> emojis <id>\` to override the default emoji set for a *specific* channel.
    `);
    baseEmbed.addField('More Information', `[Link](${docsRef}#vote-emojis)`);

    ctx.embed(baseEmbed);
  }

  async runPostconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    // TODO make sure to implement checks so this only runs when an actual update method was used
    await this.client.redis.helpers.clearCachedGuild(ctx.guild!.id);

    next();
  }
}
