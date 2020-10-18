import { Collection } from '@augu/immutable';
import path from 'path';
import globFunction from 'glob';
import { promisify } from 'util';

import SuggestionsClient from '../structures/Client';
import { Command, CommandCategory, SubCommand, SuggestionsCommand } from '../types';
import Logger from '../utils/Logger';

const glob = promisify(globFunction);

abstract class BaseCommandManager<T = Command|SubCommand> extends Collection<T> {
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
    const subCmd: SubCommand = this.client.subCommands.filter(c => mainCmd && (c.arg === args[0]))[0] ||
        this.client.subCommands.filter(c => mainCmd && (c.aliases!.includes(args[0])))[0];

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
        if ('friendly' in command) this.client.subCommands.addCommand(command.name, command);
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

  public getCategory(category: CommandCategory, options?: {
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
  constructor(public client: SuggestionsClient) {
    super(client);
  }

  public async init(): Promise<void> {
    throw new Error('You cannot run the init method from the subcommand manager class!');
  }
}
