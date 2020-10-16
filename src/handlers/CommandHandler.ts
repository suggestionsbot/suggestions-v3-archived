import { GuildChannel, Message, GuildTextableChannel } from 'eris';
import { oneLine } from 'common-tags';

import SuggestionsClient from '../structures/Client';
import { Command, GuildSchema, SubCommand } from '../types';
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
    const ctx: Context = new Context(this.client, message, args, locale, settings);

    if (!message.guildID && cmd.guildOnly) {
      return MessageUtils.error(
        this.client,
        message,
        `The \`${'friendly' in cmd ? cmd.friendly : cmd.name}\` command can only be used in a server!`
      );
    }

    const staffCheck = message.guildID ? this.client.isStaff(message.member!, settings): null;
    const adminCheck = message.guildID ? this.client.isAdmin(message.member!) : null;
    const ownerCheck = this.client.isOwner(message.author);

    if ((message.guildID !== undefined) && (cmd.staffOnly && !staffCheck))
      return MessageUtils.error(this.client, message, 'This is a staff only command!');
    if ((message.guildID !== undefined) && (cmd.adminOnly && !adminCheck))
      return MessageUtils.error(this.client, message, 'This is an admin only command!');
    if (cmd.superOnly && !this.client.config.superSecretUsers.includes(message.author.id)) return;
    if (cmd.ownerOnly && !ownerCheck) return;

    // check bot permissions
    if ((message.channel instanceof GuildChannel) && (<GuildTextableChannel>message.channel) && cmd.botPermissions) {
      const pendingPermissions = (!cmd.botPermissions) ? this.minimumPermissions : this.minimumPermissions.concat(cmd.botPermissions);
      const missingPermissions: Array<string> = [];

      // TODO eventually add in functionality to format permission numbewr
      for (const permission of pendingPermissions) {
        if (!message.channel.permissionsOf(this.client.user.id).has(<string>permission)) {
          missingPermissions.push(Util.formatPermission(<string>permission));
        }
      }

      // TODO if bot is missing 'sendMessages' in a particular channel, dm the command sender
      if (missingPermissions.length > 0) {
        try { // this.client.emit('commandBlocked', cmd, `botPermissions: ${missing.join(', ')}`);
          if (missingPermissions.length === 1) {
            return message.channel.createMessage(oneLine`I need the \`${missingPermissions[0]}\` permission for the
              \`${(<Command>cmd).name || (<SubCommand>cmd).friendly}\` command to work.
            `).then((msg: Message) => this.client.wait(msg.delete, 5000));
          }
          await message.channel.createMessage(oneLine`
            I need the following permissions for the \`${cmd.name}\` command to work:
            ${missingPermissions.map((p: string) => `\`${p}\``).join(', ')}
          `);

          return;
        } catch (e) {
          return Logger.error('COMMAND HANDLER', e);
        }
      }
    }

    // rate limiting
    if (cmd.ratelimiter) {
      const ratelimiter = this.client.ratelimiters;
      if (ratelimiter.isRatelimited(cmd.name, message.author.id)) {
        return ratelimiter.handle(cmd, message.author.id, message.channel);
      } else {
        ratelimiter.setRatelimited(cmd, message.author.id);
      }
    }

    // grouped command checks
    if (cmd.checks) {
      for (const name of cmd.checks) {
        const check = this.client.checks.get(name) ?? null;
        try {
          await check!.run(ctx);
        } catch (e) {
          return MessageUtils.error(this.client, message, e);
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
      return Logger.error('COMMAND HANDLER', e.stack);
    }
  }
}
