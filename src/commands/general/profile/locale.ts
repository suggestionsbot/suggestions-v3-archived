import SubCommand from '../../../structures/core/SubCommand';
import CommandContext from '../../../structures/commands/Context';
import SuggestionsClient from '../../../structures/core/Client';
import { CommandNextFunction, Locales, locales } from '../../../types';
import MessageUtils from '../../../utils/MessageUtils';

export default class ProfileLocaleCommand extends SubCommand {
  constructor(client: SuggestionsClient) {
    super(client);
  }

  runPostconditions(ctx: CommandContext, next: CommandNextFunction): any {
    if (ctx.args.get(0) && !locales.includes(<Locales>ctx.args.get(0)))
      return MessageUtils.error(this.client, ctx.message,
        `Please provide one of the following locales: \`${locales.join(', ')}\``);

    next();
  }

  async run(ctx: CommandContext): Promise<any> {
    return ctx.send('hello world');
  }

  async runPreconditions(ctx: CommandContext, next: CommandNextFunction): Promise<any> {
    if (ctx.args.get(0)) await this.client.redis.helpers.clearCachedUser(ctx.sender.id);
    next();
  }
}
