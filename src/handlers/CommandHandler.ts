import { GuildChannel, Message, GuildTextableChannel } from 'eris';
import { oneLine } from 'common-tags';

import SuggestionsClient from '../structures/client';
import { Command, GuildSchema, SubCommand, SuggestionsMessage } from '../types';
import Util from '../utils/Util';
import Logger from '../utils/Logger';
import MessageUtils from '../utils/MessageUtils';

export default class CommandHandler {
  public minimumPermissions: Array<string|number>;

  constructor(public client: SuggestionsClient) {
    this.client = client;
    this.minimumPermissions = ['readMessages', 'sendMessages'];
  }

  public async handle(message: SuggestionsMessage, settings: GuildSchema): Promise<any> {
    let args = message.content.slice(message.prefix.length).trim().split(/ +/g);
    const command = args.shift().toLowerCase();

    let cmd: Command|SubCommand;
    const mainCmd: Command = this.client.commands.get(command) ||
        this.client.commands.get(this.client.aliases.get(command));
    const subCmd: SubCommand = this.client.subCommands.filter(c => c.arg === args[0]).first() ||
        this.client.subCommands.get(this.client.subCommandAliases.get(args[0]));

    if (mainCmd) cmd = mainCmd;
    if (subCmd) {
      cmd = subCmd;
      args = args.slice(1);
    }

    if (!cmd) return;
    // TODO eventually override Message#command with our own Command/SubCommand class

    if (!message.guildID && cmd.guildOnly) {
      return MessageUtils.error(
        this.client,
        message,
        `The \`${subCmd?.friendly || mainCmd.name}\` command can only be used in a server!
    `);
    }

    const staffCheck = message.guildID ? this.client.isStaff(message.member, settings): null;
    const adminCheck = message.guildID ? this.client.isAdmin(message.member) : null;
    const ownerCheck = this.client.isOwner(message.author);

    if (message.guildID) message.guild = this.client.guilds.get(message.guildID);

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
    const throttle = cmd.throttle(message.author);
    if (throttle && throttle.usages + 1 > cmd.throttling.usages) {
      const remaining = (throttle.start + (cmd.throttling.duration * 1000) - Date.now()) / 1000;
      // this.client.emit('commandBlocked', cmd, 'throttling');
      return message.channel.createMessage(
        `You may not use the \`${cmd.name}\` command again for another \`${remaining.toFixed(1)}\` seconds.`
      );
    }

    // run preconditions
    const preConditionNext = async (): Promise<any> => {
      try {
        if (throttle) throttle.usages++;
        await cmd.run(message, args, settings);
        if (cmd.runPostconditions) await cmd.runPostconditions(message, args, postConditionNext);
        // TODO make sure to eventually set this to only run in production in the future

        await Promise.all([
          this.client.redis.redis.hincrby(`guild:${message.guildID}:user:${message.author.id}:commands`, cmd.name, 1),
          this.client.redis.redis.hincrby(`guild:${message.guildID}:commands`, cmd.name, 1),
          this.client.redis.redis.incrby(`guild:${message.guildID}:commands:count`, 1),
          this.client.redis.redis.incrby('global:commands', 1),
          this.client.database.commandHelpers.createCommand(message, cmd.name)
        ]);
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
        if (throttle) throttle.usages++;
        await cmd.runPreconditions(message, args, preConditionNext, settings);
      } else {
        await preConditionNext();
      }
    } catch (e) {
      return Logger.error('COMMAND HANDLER', e.stack);
    }
  }
}
