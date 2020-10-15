import Command from '../../../structures/Command';
import SuggestionsClient from '../../../structures/Client';
import Context from '../../../structures/Context';

export default class ConfigCommand extends Command {
  constructor(public client: SuggestionsClient) {
    super(client);

    this.name = 'config';
    this.subCommands = ['prefix', 'channels', 'roles', 'emojis', 'responses', 'commands'];
    this.category = 'admin';
    this.description = 'View and update various configurable values of the bot';
    this.aliases = ['conf', 'settings', 'configure'];
    this.usages = [
      'config prefix [value]',
      'config channels [channel] [type]',
      'config roles [list, of, roles]',
      'config emojis set <id>',
      'config emojis add <emoji1, emoji2>',
      'config emojis delete <id>',
      'config responses [on|off] [all|response]',
      'config commands [list, of, commands]'
    ];
    this.examples = [
      'config prefix ^',
      'config channels #video-ideas suggestions',
      'config channels #staff-review review',
      'config roles Admin',
      'config roles @Admin, @Mod',
      'config emojis set 5',
      'config emojis add :upvote:, :downvote:',
      'config emojis delete 3',
      'config responses off rejected',
      'config responses on approved',
      'config responses off all',
      'config commands approve, reject'
    ];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis'];
  }

  public async run(ctx: Context): Promise<any> {

  }
}