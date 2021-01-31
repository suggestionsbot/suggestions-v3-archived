import { Guild } from 'eris';
import { SuggestionGuild, SuggestionSchema } from '../../../types';
import SuggestionModel from '../models/suggestion';
import Util from '../../../utils/Util';
import MongoDB from '../';
import Suggestion from '../../../structures/suggestions/Suggestion';
import { DocumentQuery } from 'mongoose';
import Logger from '../../../utils/Logger';

export default class SuggestionHelpers {
  constructor(public database: MongoDB) {}

  public static getSuggestionQuery(query: string): Array<Record<string, string|RegExp>> {
    if (query.length === 40) {
      return [{ id: query }];
    }

    if (query.length === 7) {
      return [{ id: new RegExp(query, 'i') }];
    }

    const snowflake = /^(\d{17,19})$/g;
    if (query.match(snowflake)) {
      return [{ message: query }];
    }

    const messageLink = /(https?:\/\/)?(www\.)?((canary|ptb)\.?|(discordapp|discord\.com)\/channels)\/(.+[[0-9])/g;
    if (query.match(messageLink)) {
      return [{ message: Util.getMessageIDFromLink(query) }];
    }

    return [];
  }

  public static getMessageLink(ctx: SuggestionSchema): string {
    return `https://discord.com/channels/${ctx.guild}/${ctx.channel}/${ctx.message}`;
  }

  public static getSuggestionID(ctx: SuggestionSchema, long = false): string {
    if (long) return ctx.id;
    else return ctx.id.slice(33, 40);
  }

  public getSuggestions(guild: SuggestionGuild): DocumentQuery<Array<SuggestionSchema>, SuggestionSchema, Record<string, any>> {
    return SuggestionModel.find({ guild: Util.getGuildID(guild) });
  }

  public async getSuggestion(query: string): Promise<Suggestion|undefined> {
    const fetched = await SuggestionModel.findOne({ $or: SuggestionHelpers.getSuggestionQuery(query) });
    if (!fetched) throw new Error('SuggestionNotFound');

    if (fetched) return new Suggestion(this.database.client).setData(fetched);
    else return;
  }

  public createSuggestion(suggestion: Record<string, unknown>): Promise<SuggestionSchema> {
    const schema = new SuggestionModel(suggestion);
    return schema.save();
  }

  public async deleteSuggestion(query: string): Promise<boolean> {
    const deleted = await SuggestionModel.deleteOne({ $or: SuggestionHelpers.getSuggestionQuery(query) });
    return !!deleted.ok;
  }

  public async deleteAllSuggestions(guild: Guild|string): Promise<boolean> {
    const deleted = await SuggestionModel.deleteMany({ guild: Util.getGuildID(guild) });
    return !!deleted.ok;
  }
}
