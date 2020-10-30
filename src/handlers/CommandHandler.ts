import { GuildChannel, Message } from 'eris';
import { oneLine } from 'common-tags';

import SuggestionsClient from '../structures/Client';
import { GuildSchema } from '../types';
import Util from '../utils/Util';
import Logger from '../utils/Logger';
import MessageUtils from '../utils/MessageUtils';
import Context from '../structures/Context';

export default class CommandHandler {
  public minimumPermissions: Array<string|number>;

  constructor(public client: SuggestionsClient) {
    this.minimumPermissions = ['readMessages', 'sendMessages'];
  }

  public async handle(message: Message, settings: GuildSchema): Promise<any> {
    let args = message.content.slice(message.prefix!.length).trim().split(/ +/g);
    const command = args.shift()!.toLowerCase();

    const cmd = this.client.commands.getCommand(command, ...args);
    if (cmd && 'friendly' in cmd) args = args.slice(1);

    if (!cmd) return;

    const locale = this.client.locales.get(settings.locale);
    const ctx: Context = new Context(message, args, locale, settings);

    if (!message.guildID && cmd.guildOnly) {
      return MessageUtils.error(
        this.client,
        message,
        `The \`${'friendly' in cmd ? cmd.friendly : cmd.name}\` command can only be used in a server!`);
    }

    const staffCheck = message.guildID ? this.client.isStaff(message.member!, settings): null;
    const adminCheck = message.guildID ? this.client.isAdmin(message.member!) : null;
    const superSecretCheck = this.client.isSuperSecret(message.author);
    const ownerCheck = this.client.isOwner(message.author);

    if ((message.guildID !== undefined) && (cmd.staffOnly && !staffCheck))
      return MessageUtils.error(this.client, message, 'This is a staff only command!');
    if ((message.guildID !== undefined) && (cmd.adminOnly && !adminCheck))
      return MessageUtils.error(this.client, message, 'This is an admin only command!');
    if (cmd.superOnly && !superSecretCheck) return;
    if (cmd.ownerOnly && !ownerCheck) return;

    // check bot permissions
    if ((message.channel instanceof GuildChannel) && cmd.botPermissions) {
      const pendingPermissions = (!cmd.botPermissions) ? this.minimumPermissions : this.minimumPermissions.concat(cmd.botPermissions);
      const missingPermissions = Util.getMissingPermissions(pendingPermissions, message.channel, ctx.me!);
      const cmdName = 'friendly' in cmd ? cmd.friendly : cmd.name;

      // TODO if bot is missing 'sendMessages' in a particular channel, dm the command sender
      // TODO eventually add in functionality to format permission numbewr
      if (missingPermissions.length > 0) return MessageUtils.error(this.client, message, oneLine`I need the 
        \`${missingPermissions.map(p => `\`${p}\``).join(', ')}\` permission(s) for the \`${cmdName}\` command to work.`);
    }

    // rate limiting
    if (cmd.ratelimiter) {
      const ratelimit = cmd.ratelimiter.get(message.author.id);
      if (ratelimit && ratelimit.manager.isRatelimited(ratelimit)) {
        const data = ratelimit.manager.handle(cmd, message.author.id, message.channel);
        if (data) return;
      } else {
        this.client.ratelimiters.setRatelimited(cmd, message.author.id);
      }
    }

    // grouped command checks
    if (cmd.checks) {
      for (const name of cmd.checks) {
        const check = this.client.checks.get(name) ?? null;
        try {
          await check!.run(ctx);
        } catch (e) {
          return MessageUtils.error(this.client, message, e.message);
        }
      }
    }

    // run preconditions
    const preConditionNext = async (): Promise<any> => {
      try {
        await cmd.run(ctx);
        if (cmd.runPostconditions) await cmd.runPostconditions(ctx, postConditionNext);
        // TODO make sure to eventually set this to only run in production in the future

        if (this.client.redis.redis) {
          await Promise.all([
            this.client.redis.redis.hincrby(`guild:${message.guildID}:member:${message.author.id}:commands`, cmd.name, 1),
            this.client.redis.redis.hincrby(`guild:${message.guildID}:commands`, cmd.name, 1),
            this.client.redis.redis.incrby(`guild:${message.guildID}:commands:count`, 1),
            this.client.redis.redis.incrby('global:commands', 1),
            this.client.database.commandHelpers.createCommand(message, cmd.name)
          ]);
        }
      } catch (e) {
        Logger.error('COMMAND HANDLER', e);
        return MessageUtils.error(this.client, message, e.message, true);
      }
    };

    // run postconditions
    const postConditionNext = async (): Promise<any> => {
      return;
    };

    try {
      if (cmd.runPreconditions) {
        await cmd.runPreconditions(ctx, preConditionNext);
      } else {
        await preConditionNext();
      }
    } catch (e) {
      Logger.error('COMMAND HANDLER', e.stack);
      return MessageUtils.error(this.client, ctx.message, e.message, true);
    }
  }
}
