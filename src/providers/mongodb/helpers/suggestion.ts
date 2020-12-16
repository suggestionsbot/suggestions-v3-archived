import { Guild } from 'eris';
import { SuggestionGuild, SuggestionSchema } from '../../../types';
import SuggestionModel from '../models/suggestion';
import Logger from '../../../utils/Logger';
import Util from '../../../utils/Util';
import MongoDB from '../';

export default class SuggestionHelpers {
  constructor(public database: MongoDB) {}

  private static _querySuggestion(query: string): Array<Record<string, unknown>> {
    return [
      { id: query.length !== 7 ? query : new RegExp(query, 'i') },
      { message: query }
    ];
  }

  public static getMessageLink(ctx: SuggestionSchema): string {
    return `https://discord.com/channels/${ctx.guild}/${ctx.channel}/${ctx.message}`;
  }

  public static getSuggestionID(ctx: SuggestionSchema, long = false): string {
    if (long) return ctx.id;
    else return ctx.id.slice(33, 40);
  }

  public async getSuggestions(guild: SuggestionGuild): Promise<Array<SuggestionSchema>|undefined> {
    return SuggestionModel.find({ guild: Util.getGuildID(guild) });
  }

  public async getSuggestion(guildID: string, query: string, guild = true): Promise<SuggestionSchema|null> {
    const fetched = await SuggestionModel.findOne({ $or: SuggestionHelpers._querySuggestion(query) });

    if (guild && (fetched!.guild !== guildID)) throw new Error('GuildScope');

    return fetched;
  }

  public async createSuggestion(suggestion: Record<string, unknown>): Promise<SuggestionSchema> {
    const schema = new SuggestionModel(suggestion);
    return schema.save();
  }

  public async deleteSuggestion(query: string): Promise<boolean> {
    const deleted = await SuggestionModel.deleteOne({ $or: SuggestionHelpers._querySuggestion(query) });
    return !!deleted.ok;
  }

  public async deleteSuggestions(guild: Guild|string): Promise<boolean> {
    const deleted = await SuggestionModel.deleteMany({ guild: Util.getGuildID(guild) });
    return !!deleted.ok;
  }
}
