import Command from '../../../structures/core/Command';
import SuggestionsClient from '../../../structures/core/Client';
import Context from '../../../structures/commands/Context';
import { CommandCategory } from '../../../types';

export default class ConfigCommand extends Command {
  constructor(public client: SuggestionsClient) {
    super(client);

    this.name = 'config';
    this.category = CommandCategory.ADMIN;
    this.description = 'View and update various configurable values of the bot';
    this.aliases = ['conf', 'settings', 'configure'];
    this.usages = [
      'config prefix [value]',
      'config channels [channel] [type]',
      'config roles [list, of, roles]',
      'config emojis set <id>',
      'config emojis add <emoji1, emoji2>',
      'config emojis delete <id>',
      'config responses [command] [on|true|off|false|all|none',
      'config commands [list, of, commands]',
      'config restrictVoting [on|true|off|false|toggle]',
      'config selfVoting [on|true|off|false|toggle]',
      'config restrictVoting [on|true|off|false|toggle]',
      'config staffCanDelete [on|true|off|false|toggle]',
      'config allowNicknames [on|true|off|false|toggle]'
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
      'config responses reject on',
      'config responses approved false',
      'config responses all toggle',
      'config commands approve, reject',
      'config restrictVoting toggle',
      'config selfVoting off',
      'config restrictVoting true',
      'config staffCanDelete on',
      'config allowNicknames toggle'
    ];
    this.adminOnly = true;
    this.botPermissions = ['manageMessages', 'externalEmojis'];
  }

  async run(ctx: Context): Promise<any> {
    return ctx.send('hello world');
  }
}
