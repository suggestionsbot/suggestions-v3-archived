import { Guild } from 'eris';
import { SuggestionGuild, SuggestionSchema } from '../../../types';
import SuggestionModel from '../models/suggestion';
import Util from '../../../utils/Util';
import MongoDB from '../';
import Suggestion from '../../../structures/suggestions/Suggestion';
import { DocumentQuery } from 'mongoose';

export default class SuggestionHelpers {
  constructor(public database: MongoDB) {}

  private static querySuggestion(query: string): Array<Record<string, unknown>> {
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

  public getSuggestions(guild: SuggestionGuild): DocumentQuery<Array<SuggestionSchema>, SuggestionSchema, Record<string, unknown>> {
    return SuggestionModel.find({ guild: Util.getGuildID(guild) });
  }

  public async getSuggestion(guildID: string, query: string, guild = true): Promise<Suggestion|null> {
    const fetched = await SuggestionModel.findOne({ $or: SuggestionHelpers.querySuggestion(query) });
    if (!fetched) throw new Error('SuggestionNotFound');

    if (guild && (fetched!.guild !== guildID)) throw new Error('GuildScope');

    if (fetched) return new Suggestion(this.database.client).setData(fetched);
    else return null;
  }

  public createSuggestion(suggestion: Record<string, unknown>): Promise<SuggestionSchema> {
    const schema = new SuggestionModel(suggestion);
    return schema.save();
  }

  public async deleteSuggestion(query: string): Promise<boolean> {
    const deleted = await SuggestionModel.deleteOne({ $or: SuggestionHelpers.querySuggestion(query) });
    return !!deleted.ok;
  }

  public async deleteAllSuggestions(guild: Guild|string): Promise<boolean> {
    const deleted = await SuggestionModel.deleteMany({ guild: Util.getGuildID(guild) });
    return !!deleted.ok;
  }
}
