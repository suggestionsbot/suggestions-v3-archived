import { Guild } from 'eris';
import { DocumentQuery } from 'mongoose';

import { SuggestionGuild, SuggestionSchema } from '../../../types';
import SuggestionModel from '../models/suggestion';
import Util from '../../../utils/Util';
import MongoDB from '../';
import Suggestion from '../../../structures/suggestions/Suggestion';

export default class SuggestionHelpers {
  constructor(public database: MongoDB) {}

  static getSuggestionQuery(query: string): Array<Record<string, string|RegExp>> {
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

  static getMessageLink(ctx: SuggestionSchema): string {
    return `https://discord.com/channels/${ctx.guild}/${ctx.channel}/${ctx.message}`;
  }

  static getSuggestionID(ctx: SuggestionSchema, long = false): string {
    if (long) return ctx.id;
    else return ctx.id.slice(33, 40);
  }

  getSuggestions(guild: SuggestionGuild): DocumentQuery<Array<SuggestionSchema>, SuggestionSchema, Record<string, any>> {
    return SuggestionModel.find({ guild: Util.getGuildID(guild) });
  }

  async getSuggestion(query: string, raw?: boolean): Promise<Suggestion|SuggestionSchema|undefined> {
    const fetched = await SuggestionModel.findOne({ $or: SuggestionHelpers.getSuggestionQuery(query) });
    if (!fetched) throw new Error('SuggestionNotFound');

    if (raw) return fetched;
    else return new Suggestion(this.database.client).setData(fetched);
  }

  createSuggestion(suggestion: Record<string, unknown>): Promise<SuggestionSchema> {
    const schema = new SuggestionModel(suggestion);
    return schema.save();
  }

  async deleteSuggestion(query: string): Promise<boolean> {
    const deleted = await SuggestionModel.deleteOne({ $or: SuggestionHelpers.getSuggestionQuery(query) });
    return !!deleted.ok;
  }

  async deleteAllSuggestions(guild: Guild|string): Promise<boolean> {
    const deleted = await SuggestionModel.deleteMany({ guild: Util.getGuildID(guild) });
    return !!deleted.ok;
  }
}
