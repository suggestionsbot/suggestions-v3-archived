import Command from '../../structures/Command';
import SuggestionsClient from '../../structures/Client';
import Context from '../../structures/Context';
import { CommandCategory } from '../../types';
import * as crypto from 'crypto';

export default class PingCommand extends Command {
  constructor(public client: SuggestionsClient) {
    super(client);

    this.name = 'super';
    this.category = CommandCategory.SECRET;
    this.description = 'A "super" secret command!';
    this.superOnly = true;
    this.guildOnly = false;
  }

  public async run(ctx: Context): Promise<any> {
    return ctx.send(crypto.randomBytes(64).toString('hex'));
  }
}
