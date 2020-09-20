import { GuildChannel, Message, GuildTextableChannel } from 'eris';
import { oneLine } from 'common-tags';

import SuggestionsClient from '../structures/client';
import { Command, SubCommand } from '../types';
import Util from '../utils/Util';

export default class CommandHandler {
  public minimumPermissions: Array<string|number>;

  constructor(public client: SuggestionsClient) {
    this.client = client;
    this.minimumPermissions = ['readMessages', 'sendMessages'];
  }

  public async handle(message: Message): Promise<void> {
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

    // check bot permissions
    if ((message.channel instanceof GuildChannel) && (message.channel as GuildTextableChannel) && cmd.botPermissions) {
      const pendingPermissions = (!cmd.botPermissions) ? this.minimumPermissions : this.minimumPermissions.concat(cmd.botPermissions);
      const missingPermissions: Array<string> = [];

      // TODO eventually add in functionality to format permission numbewr
      for (const permission of pendingPermissions) {
        if (!message.channel.permissionsOf(this.client.user.id).has(permission as string)) {
          missingPermissions.push(Util.formatPermission(permission as string));
        }
      }

      // TODO if bot is missing 'sendMessages' in a particular channel, dm the command sender
      if (missingPermissions.length > 0) {
        // this.client.emit('commandBlocked', cmd, `botPermissions: ${missing.join(', ')}`);
        if (missingPermissions.length === 1) {
          return message.channel.createMessage(`I need the \`${missingPermissions[0]}\` permission for the \`${cmd.name}\` command to work.`)
            .then((msg: Message) => this.client.wait(msg.delete, 5000));
        }
        await message.channel.createMessage(oneLine`
    			I need the following permissions for the \`${cmd.name}\` command to work:
    			${missingPermissions.map((p: string) => `\`${p}\``).join(', ')}
    		`);

        return;
      }
    }

    // rate limiting
    const throttle = cmd.throttle(message.author);
    console.log(throttle.usages);
    if (throttle && throttle.usages + 1 > cmd.throttling.usages) {
      const remaining = (throttle.start + (cmd.throttling.duration * 1000) - Date.now()) / 1000;
      // this.client.emit('commandBlocked', cmd, 'throttling');
      await message.channel.createMessage(
        `You may not use the \`${cmd.name}\` command again for another \`${remaining.toFixed(1)}\` seconds.`
      );

      return;
    }

    try {
      if (throttle) throttle.usages++;
      await cmd.run(message, args, {});
    } catch (e) {
      return console.error(e.stack);
    }
  }
}
