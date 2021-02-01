import { Message } from 'eris';

import Command from '../../structures/core/Command';
import SuggestionsClient from '../../structures/core/Client';
import { CommandCategory, CommandNextFunction, SuggestionSchema } from '../../types';
import CommandContext from '../../structures/commands/Context';
import Logger from '../../utils/Logger';
import MessageUtils from '../../utils/MessageUtils';
import SuggestionChannel from '../../structures/suggestions/SuggestionChannel';
import Suggestion from '../../structures/suggestions/Suggestion';

export default class DeleteCommand extends Command {
  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'delete';
    this.category = CommandCategory.SUGGESTIONS;
    this.description = 'Delete a suggestion';
    this.aliases = ['remove'];
    this.usages = [
      'delete <siD|message link|message ID>',
      'delete <siD|message link|message ID> [--reason=reason]',
      'delete <siD|message link|message ID> [--silent]',
      'delete <siD|message link|message ID> [--global]',
      'delete <siD|message link|message ID> [--force]',
      'delete <siD|message link|message ID> [--ignore]',
    ];
    this.examples = [
      'delete 2a68e4e --reason=Accidental submission',
      'delete 804884692629323787 --silent',
      'delete 2a68e4e --ignore --reason=Violates rule 2b',
      'delete 2a68e4e --force',

    ];
    this.botPermissions = ['manageMessages', 'embedLinks', 'addReactions', 'externalEmojis'];
    this.guarded = false;
    this.active = false;
  }

  async runPreconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    const query = ctx.args.get(0);

    try {
      const suggestion = await this.client.database.helpers.suggestion.getSuggestion(query);
      if (!this.client.suggestionChannels.has(suggestion!.data.channel)) {
        const channel = await this.client.suggestionChannels.fetchChannel(suggestion!.guild, suggestion!.data.channel);
        suggestion!.setChannel(<SuggestionChannel>channel);
      }

      // TODO: Add config option to disable users from deleting their own suggestions
      // TODO: Add config option to disable staff being able to delete suggestions they didn't create (exclude admins)
      const canUseIgnore = this.client.isGuildStaff(ctx.member!, ctx.settings!);
      const canUseForce = this.client.isGuildAdmin(ctx.member!) || this.client.isOwner(ctx.sender);
      const canUseGlobal = this.client.isOwner(ctx.sender);
      const authorMatches = suggestion!.author.id === ctx.sender.id;
      const guildMatches = suggestion!.guild.id === ctx.guild!.id;
      const hasReasonFlag = ctx.flags.has('reason');
      const noReason = !hasReasonFlag || (hasReasonFlag && (ctx.flags.get('reason') === true));

      if (ctx.flags.has('force') && !canUseForce) return MessageUtils.error(this.client, ctx.message,
        'Only guild admins can use the `--force` flag.');
      if (noReason && canUseForce && ctx.flags.has('force')) return next({ suggestion });

      if (ctx.flags.has('ignore') && !canUseIgnore) return MessageUtils.error(this.client, ctx.message,
        'Only guild staff members can use the `--ignore` flag.');
      if (!canUseIgnore && !authorMatches) return MessageUtils.error(this.client, ctx.message,
        `Cannot delete suggestion **${suggestion!.id(true)}** as you are not the author!`);
      if (!ctx.flags.has('ignore') && canUseIgnore && !authorMatches) return MessageUtils.error(this.client, ctx.message,
        'Please provide the `--ignore` flag to bypass being the suggestion author');

      if (noReason && ctx.settings!.requiredResponses.includes('delete'))
        return MessageUtils.error(this.client, ctx.message, 'You must provide a reason: `--reason=<reason>`');

      if (!canUseGlobal && !guildMatches) return MessageUtils.error(this.client, ctx.message,
        `Cannot delete suggestion **${suggestion!.id(true)}** as it is in a different guild!`);
      if (!ctx.flags.has('global') && canUseGlobal && !guildMatches) return MessageUtils.error(this.client, ctx.message,
        'Please provide the `--global` flag to bypass the suggestion\'s guild scope');

      next({ suggestion });
    } catch (e) {
      if (e.message === 'SuggestionNotFound') return MessageUtils.error(this.client, ctx.message,
        `A suggestion with this query could not be found: \`${query}\``);
      Logger.error('DELETE_COMMAND', e);
      return MessageUtils.error(this.client, ctx.message, e.message, true);
    }

  }

  async run(ctx: CommandContext): Promise<Message> {
    const suggestion = <Suggestion>ctx.local!.suggestion!;
    await suggestion.channel.suggestions.delete(suggestion, ctx.sender, ctx.flags.get('reason'));
    return MessageUtils.success(this.client, ctx.message, `Successfully deleted suggestion **${suggestion!.id(true)}**`);
  }
}