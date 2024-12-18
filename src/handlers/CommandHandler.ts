import { GuildChannel, Message } from 'eris';
import { oneLine } from 'common-tags';

import SuggestionsClient from '../structures/core/Client';
import { GuildSchema, Locales, UserSchema } from '../types';
import Util from '../utils/Util';
import Logger from '../utils/Logger';
import MessageUtils from '../utils/MessageUtils';
import Context from '../structures/commands/Context';

export default class CommandHandler {
  minimumPermissions: Array<string|number>;

  constructor(public client: SuggestionsClient) {
    this.minimumPermissions = ['readMessages', 'sendMessages'];
  }

  async handle(message: Message, settings: { guild: GuildSchema, user: UserSchema }): Promise<any> {
    let args = message.content.slice(message.prefix!.length).trim().split(/ +/g);
    const command = args.shift()!.toLowerCase();

    const cmd = this.client.commands.getCommand(command, ...args);
    if (cmd && 'friendly' in cmd) args = args.slice(1);

    if (!cmd) return;

    let userLocale: Locales;
    if (message.guildID) userLocale = settings.user?.guilds?.find(p => p.id === message.guildID)?.locale
        ?? settings.user?.locale
        ?? settings.guild?.locale
        ?? this.client.config.defaults.guild.locale;
    else userLocale = settings.user?.locale ?? this.client.config.defaults.user.locale!;

    const locale = this.client.locales.getLocale(userLocale);
    const ctx: Context = new Context(message, args, locale, settings);

    /**
     * Make sure to properly go through each command below so they are properly accounted for:
     * [x] - suggest
     * [ ] - sid
     * [ ] - edit
     * [ ] - delete
     * [ ] - comment
     * [ ] - comment
     * [ ] - response
     * [ ] - approve
     * [ ] - reject
     * [ ] - note
     * [ ] - considered
     * [ ] - implemented
     */
    const validCommands = ['suggest', 'sid', 'edit', 'delete', 'comment', 'response', 'approve', 'reject',
      'note', 'considered', 'implemented'];
    if (settings.guild.channels.map(c => c.id).includes(message.channel.id) && !validCommands.includes(cmd.name))
      return message.delete();

    if (!message.guildID && cmd.guildOnly) {
      return MessageUtils.error(
        this.client,
        message,
        `The \`${'friendly' in cmd ? cmd.friendly : cmd.name}\` command can only be used in a server!`);
    }

    const staffCheck = message.guildID ? this.client.isGuildStaff(message.member!, settings.guild): true;
    const adminCheck = message.guildID ? this.client.isGuildAdmin(message.member!) : true;
    const supportCheck = await this.client.isSupport(message.author)
      .catch(e => MessageUtils.error(this.client, message, e.message, true));
    const superSecretCheck = this.client.isSuperSecret(message.author);
    const ownerCheck = this.client.isOwner(message.author);

    if ((message.guildID !== undefined) && (cmd.staffOnly && !staffCheck))
      return MessageUtils.error(this.client, message, 'This is a staff only command!');
    if ((message.guildID !== undefined) && (cmd.adminOnly && !adminCheck))
      return MessageUtils.error(this.client, message, 'This is an admin only command!');
    if (cmd.supportOnly && !supportCheck)
      return MessageUtils.error(this.client, message, 'This is a support only command!');
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
    if (cmd.conditions) {
      for (const name of cmd.conditions) {
        const check = this.client.conditions.get(name) ?? null;
        try {
          await check!.run(ctx);
        } catch (e) {
          return MessageUtils.error(this.client, message, e.message);
        }
      }
    }

    // run preconditions
    const preConditionNext = async (data?: any): Promise<any> => {
      try {
        if (data) ctx.local = data;
        await cmd.run(ctx);
        if (cmd.runPostconditions) await cmd.runPostconditions(ctx, postConditionNext);

        if (this.client.redis.instance) {
          const promises = [
            this.client.redis.instance.hincrby(`user:${message.author.id}:commands`, cmd.name, 1),
            this.client.redis.instance.hincrby('global:commands', cmd.name, 1),
            this.client.redis.instance.incr('global:commands:count')
          ];

          if (message.guild) {
            promises.push(...[
              this.client.redis.instance.hincrby(`guild:${message.guildID}:member:${message.author.id}:commands`, cmd.name, 1),
              this.client.redis.instance.hincrby(`guild:${message.guildID}:commands`, cmd.name, 1),
              this.client.redis.instance.incr(`guild:${message.guildID}:member:${message.author.id}:commands:count`),
              this.client.redis.instance.incr(`guild:${message.guildID}:commands:count`),
            ]);
          }

          await Promise.all(promises);
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
