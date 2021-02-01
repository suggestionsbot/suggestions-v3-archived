import Command from '../../structures/core/Command';
import SuggestionsClient from '../../structures/core/Client';
import Context from '../../structures/commands/Context';
import { CommandCategory } from '../../types';
import * as crypto from 'crypto';

export default class PingCommand extends Command {
  constructor(client: SuggestionsClient) {
    super(client);

    this.name = 'super';
    this.category = CommandCategory.SECRET;
    this.description = 'A "super" secret command!';
    this.superOnly = true;
    this.guildOnly = false;
  }

  async run(ctx: Context): Promise<any> {
    return ctx.send(crypto.randomBytes(64).toString('hex'));
  }
}
