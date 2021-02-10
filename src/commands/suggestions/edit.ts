import { oneLine } from 'common-tags';

import Command from '../../structures/core/Command';
import SuggestionsClient from '../../structures/core/Client';
import { CommandCategory, CommandNextFunction } from '../../types';
import CommandContext from '../../structures/commands/Context';
import Suggestion from '../../structures/suggestions/Suggestion';
import MessageUtils from '../../utils/MessageUtils';
import Logger from '../../utils/Logger';
import SuggestionChannel from '../../structures/suggestions/SuggestionChannel';
import Util from '../../utils/Util';

interface SuggestionEditData {
  suggestion: Suggestion;
  edit: string;
  reason?: string;
}

export default class EditCommand extends Command {
  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'edit';
    this.category = CommandCategory.SUGGESTIONS;
    this.description = 'Edit a suggestion';
    this.usages = [
      'edit <siD|message link|message ID> [text]',
      'edit <siD|message link|message ID> [text] [--reason=<reason>]',
      'edit <siD|message link|message ID> [text] [--silent]',
      'edit <siD|message link|message ID> [text] [--force]',
      'edit <siD|message link|message ID> [text] [--ignore]',
    ];
    this.examples = [
      'edit 2a68e4e This is a cool suggestion',
      'edit 2a68e4e This is a cool suggestion --reason=I made a typo',
      'edit 2a68e4e This is a cool suggestion --silent',
      'edit 2a68e4e This is a cool suggestion --force',
      'edit 2a68e4e This is a cool suggestion --ignore',
    ];
    this.botPermissions = ['manageMessages', 'embedLinks', 'addReactions', 'externalEmojis'];
    this.guarded = false;
  }

  async runPreconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    const query = ctx.args.get(0);
    const edit = ctx.args.slice(1).join(' ');
    if (!query) return MessageUtils.error(this.client, ctx.message,
      'Please provide a suggestion ID, message ID or message link!');
    if (!edit) return MessageUtils.error(this.client, ctx.message,
      'Please provide some text to update the suggestion!');

    try {
      const suggestion = <Suggestion>await this.client.database.helpers.suggestion.getSuggestion(query);
      if (!this.client.suggestionChannels.has(suggestion!.data.channel)) {
        const channel = await this.client.suggestionChannels.fetchChannel(suggestion!.guild, suggestion!.data.channel);
        suggestion!.setChannel(<SuggestionChannel>channel);
      }

      if (!suggestion.message) await suggestion.fetchMessage();

      // TODO: Handle if user is trying to edit a suggestion thats older than the configured timeout
      // TODO: Handle if user has reached max amount of edits for a suggestion
      // TODO: Handle automoderation checks for suggestion edits
      const canSelfEdit = ctx.settings!.userSelfEdit;
      const canStaffEdit = ctx.settings!.staffEdit;
      const canUseIgnore = this.client.isGuildStaff(ctx.member!, ctx.settings!);
      const canUseForce = this.client.isGuildAdmin(ctx.member!) || this.client.isOwner(ctx.sender);
      const canUseGlobal = this.client.isOwner(ctx.sender);

      const authorMatches = suggestion!.author.id === ctx.sender.id;
      const guildMatches = suggestion!.guild.id === ctx.guild!.id;
      const noIgnoreFlag = !ctx.flags.has('ignore') && canUseIgnore && !authorMatches;
      const reason = ctx.flags.get('reason') || '';

      if (!canSelfEdit && (!canUseIgnore || !canUseForce) && authorMatches)
        return MessageUtils.error(this.client, ctx.message,
          'You do not have permission to edit your own suggestions');

      if (ctx.flags.has('force') && !canUseForce) return MessageUtils.error(this.client, ctx.message,
        'Only guild admins can use the `--force` flag.');
      if (!reason && canUseForce && ctx.flags.has('force'))
        return next(<SuggestionEditData>{ suggestion: suggestion!, edit, reason });

      if (ctx.flags.has('ignore') && !canUseIgnore) return MessageUtils.error(this.client, ctx.message,
        'Only guild staff members can use the `--ignore` flag.');
      if (!canUseIgnore && !authorMatches) return MessageUtils.error(this.client, ctx.message,
        `Cannot edit suggestion **${suggestion!.id(true)}** as you are not the author!`);
      if (noIgnoreFlag && !canStaffEdit && !canUseForce) return MessageUtils.error(this.client, ctx.message,
        'Staff members currently cannot edit suggestions they didn\'t submit');
      if (noIgnoreFlag) return MessageUtils.error(this.client, ctx.message,
        'Please provide the `--ignore` flag to bypass being the suggestion author');

      if (!reason && ctx.settings!.requiredResponses.includes('edit'))
        return MessageUtils.error(this.client, ctx.message, 'You must provide a reason: `--reason=<reason>`');

      if (!canUseGlobal && !guildMatches) return MessageUtils.error(this.client, ctx.message,
        `Cannot delete suggestion **${suggestion!.id(true)}** as it is in a different guild!`);
      if (!ctx.flags.has('global') && canUseGlobal && !guildMatches) return MessageUtils.error(this.client, ctx.message,
        'Please provide the `--global` flag to bypass the suggestion\'s guild scope');

      next<SuggestionEditData>({ suggestion: suggestion!, edit, reason });
    } catch (e) {
      if (e.message === 'SuggestionNotFound') return MessageUtils.error(this.client, ctx.message,
        `A suggestion with this query could not be found: \`${query}\``);
      Logger.error('EDIT_COMMAND', e);
      return MessageUtils.error(this.client, ctx.message, e.message, true);
    }
  }

  async run(ctx: CommandContext): Promise<any> {
    const { suggestion, edit, reason } = <SuggestionEditData>ctx.local;
    await suggestion.channel.suggestions.edit(suggestion, ctx.sender, ctx.message, edit, reason);
    return MessageUtils.success(this.client, ctx.message,
      oneLine`Successfully edited suggestion [${Util.boldCode(suggestion.id(true))}](${suggestion.link})
        ${reason && ` with the reason: \`${reason}\``}`);
  }
}
