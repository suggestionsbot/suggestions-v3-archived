import SubCommand from '../../structures/core/SubCommand';
import CommandContext from '../../structures/commands/Context';
import { CommandCategory, CommandNextFunction, ResultEmoji, StatusUpdates, VoteResult } from '../../types';
import SuggestionsClient from '../../structures/core/Client';
import MessageUtils from '../../utils/MessageUtils';
import Logger from '../../utils/Logger';
import Suggestion from '../../structures/suggestions/Suggestion';
import SuggestionChannel from '../../structures/suggestions/SuggestionChannel';
import ApprovedState from '../../structures/suggestions/states/ApprovedState';

interface SuggestionApproveData {
  suggestion: Suggestion;
  reason?: string;
}

export default class ApproveCommand extends SubCommand {
  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'approve';
    this.category = CommandCategory.SUGGESTIONS;
    this.description = 'Approve a suggestion.';
    this.aliases = ['accept'];
    this.usages = [
      'approve <siD|message link|message ID>',
      'approve <siD|message link|message ID> [reason]',
      'approve <siD|message link|message ID> [--silent]',
      'approve <siD|message link|message ID> [--force]',
    ];
    this.examples = [
      'approve 2a68e4e Accidental submission',
      'approve 804884692629323787 --silent',
      'approve 2a68e4e --force',
    ];
    this.botPermissions = ['manageMessages', 'embedLinks', 'addReactions', 'externalEmojis'];
    this.guarded = false;
  }

  async runPreconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    const query = ctx.args.get(0);
    if (!query) return MessageUtils.error(this.client, ctx.message,
      'Please provide a suggestion ID, message ID or message link!');

    try {
      const suggestion = <Suggestion>await this.client.database.helpers.suggestion.getSuggestion(query);
      if (!this.client.suggestionChannels.has(suggestion!.data.channel)) {
        const channel = await this.client.suggestionChannels.fetchChannel(suggestion!.guild, suggestion!.data.channel);
        suggestion!.setChannel(<SuggestionChannel>channel);
      }

      const canUseIgnore = this.client.isGuildStaff(ctx.member!, ctx.settings!);
      const canUseForce = this.client.isGuildAdmin(ctx.member!) || this.client.isOwner(ctx.sender);
      const canUseGlobal = this.client.isOwner(ctx.sender);

      const guildMatches = suggestion!.guild.id === ctx.guild!.id;
      const reason = ctx.args.slice(1).join(' ');

      if (ctx.flags.has('force') && !canUseForce) return MessageUtils.error(this.client, ctx.message,
        'Only guild admins can use the `--force` flag.');
      if (!reason && canUseForce && ctx.flags.has('force'))
        return next(<SuggestionApproveData>{ suggestion: suggestion!, reason });

      if (!reason && ctx.settings!.requiredResponses.includes('delete'))
        return MessageUtils.error(this.client, ctx.message, 'You must provide a reason!');

      if (!canUseGlobal && !guildMatches) return MessageUtils.error(this.client, ctx.message,
        `Cannot approve suggestion **${suggestion!.id(true)}** as it is in a different guild!`);

      if (!ctx.flags.has('global') && canUseGlobal && !guildMatches) return MessageUtils.error(this.client, ctx.message,
        'Please provide the `--global` flag to bypass the suggestion\'s guild scope');

      next<SuggestionApproveData>({ suggestion: suggestion!, reason });
    } catch (e) {
      if (e.message === 'SuggestionNotFound') return MessageUtils.error(this.client, ctx.message,
        `A suggestion with this query could not be found: \`${query}\``);
      Logger.error('DELETE_COMMAND', e);
      return MessageUtils.error(this.client, ctx.message, e.message, true);
    }
  }

  async run(ctx: CommandContext): Promise<any> {
    const { suggestion, reason } = <SuggestionApproveData>ctx.local;

    try {
      const message = await suggestion.fetchMessage();

      const [emoji, count] = [
        Object.keys(message!.reactions),
        Object.values(message!.reactions).map(obj => obj.count)
      ];

      const results = emoji.map((e, i) => {
        return <ResultEmoji>{ emoji: e, count: count[i] };
      });

      const voted = await Promise.all(emoji.map(async x => {
        return <VoteResult>{
          emoji: x,
          voted: await message!.getReaction(x).then(reacted => reacted.map(r => r.id))
        };
      }));

      Logger.log('results', results);
      Logger.log('voted', voted);

      const toApprove = new ApprovedState(suggestion, {
        executor: ctx.sender,
        response: reason,
        target: suggestion.author,
        results,
        voted
      });

    } catch (e) {
      Logger.error('APPROVE', e.stack);
      return MessageUtils.error(this.client, ctx.message, e.message, true);
    }
  }
}
