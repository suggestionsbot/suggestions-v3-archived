import { Message } from 'eris';

import Command from '../../structures/core/Command';
import SuggestionsClient from '../../structures/core/Client';
import { CommandCategory, CommandNextFunction } from '../../types';
import CommandContext from '../../structures/commands/Context';
import Logger from '../../utils/Logger';
import MessageUtils from '../../utils/MessageUtils';
import SuggestionChannel from '../../structures/suggestions/SuggestionChannel';
import Suggestion from '../../structures/suggestions/Suggestion';

interface SuggestionNextData {
  suggestion: Suggestion;
  reason?: string;
}

export default class DeleteCommand extends Command {
  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'delete';
    this.category = CommandCategory.SUGGESTIONS;
    this.description = 'Delete a suggestion';
    this.aliases = ['remove'];
    this.usages = [
      'delete <siD|message link|message ID>',
      'delete <siD|message link|message ID> [reason]',
      'delete <siD|message link|message ID> [--silent]',
      'delete <siD|message link|message ID> [--global]',
      'delete <siD|message link|message ID> [--force]',
      'delete <siD|message link|message ID> [--ignore]',
    ];
    this.examples = [
      'delete 2a68e4e Accidental submission',
      'delete 804884692629323787 --silent',
      'delete 2a68e4e Violates rule 2b --ignore',
      'delete 2a68e4e --force',

    ];
    this.botPermissions = ['manageMessages', 'embedLinks', 'addReactions', 'externalEmojis'];
    this.guarded = false;
    this.active = false;
  }

  async runPreconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    const query = ctx.args.get(0);
    if (!query) return MessageUtils.error(this.client, ctx.message,
      'Please provide a suggestion ID, message ID or message link!');

    try {
      const suggestion = await this.client.database.helpers.suggestion.getSuggestion(query);
      if (!this.client.suggestionChannels.has(suggestion!.data.channel)) {
        const channel = await this.client.suggestionChannels.fetchChannel(suggestion!.guild, suggestion!.data.channel);
        suggestion!.setChannel(<SuggestionChannel>channel);
      }

      const canSelfDelete = ctx.settings!.userSelfDelete;
      const canStaffDelete = ctx.settings!.staffDelete;
      const canUseIgnore = this.client.isGuildStaff(ctx.member!, ctx.settings!);
      const canUseForce = this.client.isGuildAdmin(ctx.member!) || this.client.isOwner(ctx.sender);
      const canUseGlobal = this.client.isOwner(ctx.sender);

      const authorMatches = suggestion!.author.id === ctx.sender.id;
      const guildMatches = suggestion!.guild.id === ctx.guild!.id;
      const noIgnoreFlag = !ctx.flags.has('ignore') && canUseIgnore && !authorMatches;
      const reason = ctx.args.slice(1).join(' ');

      if (!canSelfDelete && (!canUseIgnore || !canUseForce) && authorMatches)
        return MessageUtils.error(this.client, ctx.message,
          'You do not have permission to delete your own suggestions');

      if (ctx.flags.has('force') && !canUseForce) return MessageUtils.error(this.client, ctx.message,
        'Only guild admins can use the `--force` flag.');
      if (!reason && canUseForce && ctx.flags.has('force'))
        return next(<SuggestionNextData>{ suggestion: suggestion!, reason });


      if (ctx.flags.has('ignore') && !canUseIgnore) return MessageUtils.error(this.client, ctx.message,
        'Only guild staff members can use the `--ignore` flag.');
      if (!canUseIgnore && !authorMatches) return MessageUtils.error(this.client, ctx.message,
        `Cannot delete suggestion **${suggestion!.id(true)}** as you are not the author!`);
      if (noIgnoreFlag && !canStaffDelete && !canUseForce) return MessageUtils.error(this.client, ctx.message,
        'Staff members currently cannot delete suggestions they didn\'t submit');
      if (noIgnoreFlag) return MessageUtils.error(this.client, ctx.message,
        'Please provide the `--ignore` flag to bypass being the suggestion author');


      if (!reason && ctx.settings!.requiredResponses.includes('delete'))
        return MessageUtils.error(this.client, ctx.message, 'You must provide a reason!');

      if (!canUseGlobal && !guildMatches) return MessageUtils.error(this.client, ctx.message,
        `Cannot delete suggestion **${suggestion!.id(true)}** as it is in a different guild!`);
      if (!ctx.flags.has('global') && canUseGlobal && !guildMatches) return MessageUtils.error(this.client, ctx.message,
        'Please provide the `--global` flag to bypass the suggestion\'s guild scope');

      next<SuggestionNextData>({ suggestion: suggestion!, reason });
    } catch (e) {
      if (e.message === 'SuggestionNotFound') return MessageUtils.error(this.client, ctx.message,
        `A suggestion with this query could not be found: \`${query}\``);
      Logger.error('DELETE_COMMAND', e);
      return MessageUtils.error(this.client, ctx.message, e.message, true);
    }

  }

  async run(ctx: CommandContext): Promise<Message> {
    const { suggestion, reason } = <SuggestionNextData>ctx.local;
    await suggestion.channel.suggestions.delete(suggestion, ctx.sender, reason);
    return MessageUtils.success(this.client, ctx.message,
      `Successfully deleted suggestion **${suggestion.id(true)}**${reason && ` with the reason: \`${reason}\``}`);
  }
}
