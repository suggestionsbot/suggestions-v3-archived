import { Collection } from '@augu/immutable';
import path from "path";
import globFunction from 'glob';
import { promisify } from 'util';

import SuggestionsClient from '../structures/Client';
import { Command, SubCommand } from '../types';
import Logger from '../utils/Logger';

const glob = promisify(globFunction);

abstract class BaseCommandManager<T = Command|SubCommand> extends Collection<T> {
  protected constructor(public client: SuggestionsClient) {
    super();

    this.client = client;
  }

  private static get _directory(): string {
    return `${path.dirname(require.main.filename)}${path.sep}/commands/**/*.{js,ts}`;
  }

  public addCommand(name: string, command: T): void {
    this.set(name, command);
  }

  public getCommand(command: string, ...args: Array<string>): Command|SubCommand {
    let cmd: Command|SubCommand;
    const mainCmd: Command = this.client.commands.get(command) ||
        this.client.commands.filter(c => c.aliases.includes(command))[0];
    const subCmd: SubCommand = this.client.subCommands.filter(c => c.arg === args[0])[0] ||
        this.client.subCommands.filter(c => c.aliases.includes(command))[0];

    if (mainCmd) cmd = mainCmd;
    if (subCmd) cmd = subCmd;

    return cmd;
  }

  public async init(): Promise<void> {
    return glob(BaseCommandManager._directory).then(async (files: any) => {
      if (!files.length) return Logger.error('COMMANDS', 'Couldn\'t find any command files!');

      for (const file of files) {
        const { default: CommandFile } = await import(file);
        const command = new CommandFile(this.client);
        if (!command.parent) this.client.commands.addCommand(command.name, command);
        else this.client.subCommands.addCommand(command.name, command);
        delete require.cache[file];
      }
    });
  }
}

export class CommandManager extends BaseCommandManager<Command> {
  constructor(public client: SuggestionsClient) {
    super(client);
  }

  public getCategory(category: string): Array<Command> {
    return this.filter(c => c.category.toLowerCase() === category.trim().toLowerCase());
  }
}

export class SubCommandManager extends BaseCommandManager<SubCommand> {
  constructor(public client: SuggestionsClient) {
    super(client);
  }

  public async init(): Promise<void> {
    throw new Error('You cannot run the init method from the subcommand manager class!');
  }
}
