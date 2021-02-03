import { Message } from 'eris';
import { Collection } from '@augu/immutable';
import path from 'path';

import SuggestionsClient from '../structures/core/Client';
import { Command, CommandCategory, GuildSchema, SubCommand, SuggestionsCommand } from '../types';
import Logger from '../utils/Logger';
import Util from '../utils/Util';

abstract class BaseCommandManager<T = Command|SubCommand> extends Collection<T> {
  protected constructor(public client: SuggestionsClient) {
    super();
  }

  private static get directory(): string {
    return `${path.join(path.dirname(require.main!.filename), 'commands')}`;
  }

  addCommand(name: string, command: T): void {
    this.set(name, command);
  }

  getCommand(command: string, ...args: Array<string>): SuggestionsCommand {
    let cmd: SuggestionsCommand;
    const mainCmd = this.client.commands.get(command) ||
        this.client.commands.find(c => c.aliases! && c.aliases.includes(command));
    const subCmd = this.client.subCommands.get(command) ||
        this.client.subCommands.find(c => mainCmd! && (c.parent === mainCmd.name) && (c.arg === args[0])) ||
        this.client.subCommands.find(c => mainCmd! && (c.parent === mainCmd.name) && (c.aliases!.includes(args[0])));

    if (mainCmd) cmd = mainCmd;
    if (subCmd) cmd = subCmd;

    return cmd!;
  }

  async isCommand(message: Message, settings: GuildSchema): Promise<boolean> {
    const prefixes = this.client.getPrefixes(true, false, settings);
    const prefixRegex = new RegExp(`(${prefixes.join('|')})`);
    const prefix =  message.content.match(prefixRegex) ? message.content.match(prefixRegex)![0] : undefined;
    if (!prefix) return false;
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const command = args.shift()!.toLowerCase();
    return !!this.getCommand(command, ...args);
  }

  async init(): Promise<void> {
    const files = Util.walk(BaseCommandManager.directory, ['.js', '.ts']);
    if (!files.length) return Logger.error('COMMANDS', 'Couldn\'t find any command files!');

    for (const file of files) {
      delete require.cache[file];
      const { default: CommandFile } = await import(file);
      const command: SuggestionsCommand = new CommandFile(this.client);
      if ('friendly' in command) this.client.subCommands.addCommand(command.name, command);
      else this.client.commands.addCommand(command.name, command);
    }
  }
}

export class CommandManager extends BaseCommandManager<Command> {
  constructor(client: SuggestionsClient) {
    super(client);
  }

  getCategory(category: CommandCategory, options?: {
    namesOnly?: boolean,
    formatted?: boolean,
  }): Array<Command|string> {
    if (options?.namesOnly) {
      let cmds = this.filter(c => c.category.toLowerCase() === category.toLowerCase()).map(c => c.name);
      if (options.formatted) cmds = cmds.map(name => options.formatted ? `\`${name}\`` : name);

      return cmds;
    } else {
      return this.filter(c => c.category.toLowerCase() === category.toLowerCase());
    }
  }
}

export class SubCommandManager extends BaseCommandManager<SubCommand> {
  constructor(client: SuggestionsClient) {
    super(client);
  }

  async init(): Promise<void> {
    throw new Error('You cannot run the init method from the subcommand manager class!');
  }
}
