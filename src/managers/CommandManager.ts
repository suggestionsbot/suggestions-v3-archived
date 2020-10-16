import { Collection } from '@augu/immutable';
import path from 'path';
import globFunction from 'glob';
import { promisify } from 'util';

import SuggestionsClient from '../structures/Client';
import { Command, SubCommand, SuggestionsCommand } from '../types';
import Logger from '../utils/Logger';

const glob = promisify(globFunction);

abstract class BaseCommandManager<T = SubCommand> extends Collection<T> {
  protected constructor(public client: SuggestionsClient) {
    super();
  }

  private static get _directory(): string {
    return `${path.join(path.dirname(require.main!.filename), 'commands', '**', '*.{ts,js}')}`;
  }

  public addCommand(name: string, command: T): void {
    this.set(name, command);
  }

  public getCommand(command: string, ...args: Array<string>): SuggestionsCommand {
    let cmd: SuggestionsCommand;
    const mainCmd: Command = this.client.commands.get(command) ||
        this.client.commands.filter(c => c.aliases!.includes(command))[0];
    const subCmd: SubCommand = this.client.subCommands.filter(c => c.arg === args[0])[0] ||
        this.client.subCommands.filter(c => c.aliases!.includes(command))[0];

    if (mainCmd) cmd = mainCmd;
    if (subCmd) cmd = subCmd;

    return cmd!;
  }

  public async init(): Promise<void> {
    return glob(BaseCommandManager._directory).then(async (files: any) => {
      if (!files.length) return Logger.error('COMMANDS', 'Couldn\'t find any command files!');

      for (const file of files) {
        const { default: CommandFile } = await import(file);
        const command: SuggestionsCommand = new CommandFile(this.client);
        if (command instanceof SubCommand) this.client.subCommands.addCommand(command.name, command);
        else this.client.commands.addCommand(command.name, command);
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
