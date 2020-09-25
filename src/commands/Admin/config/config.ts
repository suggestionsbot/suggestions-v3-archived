import Command from '../../../structures/command';
import SuggestionsClient from '../../../structures/client';
import { GuildSchema, SuggestionsMessage } from '../../../types';
import { Embed, Message } from 'eris';

export default class ConfigCommand extends Command {
  constructor(public client: SuggestionsClient) {
    super(client);

    this.name = 'config';
    this.subCommands = ['prefix', 'channels', 'roles', 'emojis', 'responses', 'commands'];
    this.category = 'Admin';
    this.description = 'View and update various configurable values of the bot';
    this.aliases = ['conf', 'settings', 'configure'];
    this.usages = [
      'config prefix [value]',
      'config channels [channel] [type]',
      'config roles [list, of, roles]',
      'config emojis [id]',
      'config emojis add <emoji1, emoji2>',
      'config responses [on|off] [all|response]',
      'config commands [list, of, commands]'
    ];
    this.examples = [
      'config prefix ^',
      'config channels #video-ideas suggestions',
      'config channels #staff-review review',
      'config roles Admin',
      'config roles @Admin, @Mod',
      'config emojis 5',
      'config emojis :upvote:, :downvote:',
      'config responses off rejectd',
      'config responses on approved',
      'config responses off all',
      'config commands approve, reject'
    ];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis'];
    this.guarded = true;
  }

  public async run(message: SuggestionsMessage, args: Array<string>, settings: GuildSchema): Promise<any> {

  }
}
