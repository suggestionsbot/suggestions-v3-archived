import { Message, User } from 'eris';

import SuggestionsClient from '../../../structures/Client';
import Command from '../models/command';
import { CommandSchema, SuggestionGuild } from '../../../types';
import Logger from '../../../utils/Logger';
import Util from '../../../utils/Util';

export default class CommandHelpers {
  constructor(public client: SuggestionsClient) {}

  public async deleteCommands(guild: SuggestionGuild): Promise<boolean> {
    await Command.deleteMany({ guild: Util.getGuildID(guild) });
    return true;
  }

  public async getCommand(command: string, user: User, guild?: SuggestionGuild): Promise<{ command: string; count: number }> {
    const documents = await Command.find({
      user: user.id,
      guild: Util.getGuildID(guild!),
      command
    });

    return {
      command,
      count: documents.length
    };
  }

  public async getCommands(user: User, guild?: SuggestionGuild): Promise<Array<{ command: string; count: number; }>> {
    const documents = await Command.find({ user: user.id, guild: Util.getGuildID(guild!) });
    const commands = documents.map(d => d.command);
    const unique = [...new Set(commands)];

    const arr: Array<{ command: string; count: number; }> = [];

    for (const c of unique) {
      for (const d of commands) {
        if (d === c) {
          const filter = (data: { command: string; count: number; }): boolean => data.command === c;
          if (arr.map(a => a.command).includes(c)) arr.find(filter)!.count++;
          else arr.push({ command: c, count: 1 });
        }
      }
    }

    return arr;
  }

  public async createCommand(message: Message, command: string): Promise<CommandSchema> {
    const document = new Command({});
    document.guild = message.guildID!;
    document.channel = message.channel.id;
    document.message = message.id;
    document.command = command;
    document.user = message.author.id;

    const data = await document.save();

    const tag = Util.formatUserTag(message.author);
    Logger.command(document.command, `${tag} ran the command ${command}`);
    return data;
  }
}
