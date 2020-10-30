import SuggestionsClient from '../structures/Client';
import { Command } from '../types';
import Logger from '../utils/Logger';
import MessageUtils from '../utils/MessageUtils';
import CommandContext from '../structures/Context';

export default class SuggestionHandler {
  constructor(public client: SuggestionsClient) {}

  public async handle(ctx: CommandContext): Promise<any> {
    const command = <Command>this.client.commands.getCommand('suggest');
    if (!command) return;

    // rate limiting
    if (command.ratelimiter) {
      const ratelimit = command.ratelimiter.get(ctx.message.author.id);
      if (ratelimit && ratelimit.manager.isRatelimited(ratelimit)) {
        const data = ratelimit.manager.handle(command, ctx.message.author.id, ctx.message.channel);
        if (data) return;
      } else {
        this.client.ratelimiters.setRatelimited(command, ctx.message.author.id);
      }
    }

    // grouped command checks
    for (const name of command.checks!) {
      const check = this.client.checks.get(name) ?? null;
      try {
        await check!.run(ctx);
      } catch (e) {
        return MessageUtils.error(this.client, ctx.message, e.message);
      }
    }

    // run preconditions
    const preConditionNext = async (): Promise<any> => {
      try {
        await command.run(ctx);
        if (command.runPostconditions) await command.runPostconditions(ctx, postConditionNext);
        // TODO make sure to eventually set this to only run in production in the future

        if (this.client.redis.redis) {
          await Promise.all([
            this.client.redis.redis.hincrby(`guild:${ctx.message.guildID}:member:${ctx.message.author.id}:commands`, command.name, 1),
            this.client.redis.redis.hincrby(`guild:${ctx.message.guildID}:commands`, command.name, 1),
            this.client.redis.redis.incrby(`guild:${ctx.message.guildID}:commands:count`, 1),
            this.client.redis.redis.incrby('global:commands', 1),
            this.client.database.commandHelpers.createCommand(ctx.message, command.name)
          ]);
        }
      } catch (e) {
        Logger.error('COMMAND HANDLER', e);
        return MessageUtils.error(this.client, ctx.message, e.message, true);
      }
    };

    // run postconditions
    const postConditionNext = async (): Promise<any> => {
      return;
    };

    try {
      if (command.runPreconditions) {
        await command.runPreconditions(ctx, preConditionNext);
      } else {
        await preConditionNext();
      }
    } catch (e) {
      Logger.error('COMMAND HANDLER', e.stack);
      return MessageUtils.error(this.client, ctx.message, e.message, true);
    }
  }
}
