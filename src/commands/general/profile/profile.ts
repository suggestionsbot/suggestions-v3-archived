import Command from '../../../structures/core/Command';
import SuggestionsClient from '../../../structures/core/Client';
import CommandContext from '../../../structures/commands/Context';
import { CommandCategory } from '../../../types';

export default class ProfileCommand extends Command {
  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'profile';
    this.category = CommandCategory.GENERAL;
    this.description = 'View various options regarding your guild profile as well as set those properties.';
    this.aliases = [
      'usersettings',
      'user',
      'userinfo',
      'ui'
    ];
    this.usages = [
      'profile locale [locale>]',
      'profile showNickname [on|true|off|false|toggle',
      'profile notifications [command|all|none] [on|true|off|false|toggle]'
    ];
    this.botPermissions = ['manageMessages', 'externalEmojis', 'embedLinks'];
    this.guildOnly = false;
  }

  async run(ctx: CommandContext): Promise<any> {
    return ctx.send('ok');
  }
}
