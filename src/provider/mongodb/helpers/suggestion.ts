import SuggestionsClient from '../../../structures/client';
import { Guild } from 'eris';
import { SuggestionSchema, SuggestionsMessage } from '../../../types';
import SuggestionModel from '../models/suggestion';
import Logger from '../../../utils/Logger';
import Util from '../../../utils/Util';

export default class SuggestionHelpers {
  constructor(public client: SuggestionsClient) {
    this.client = client;
  }

  private static _querySuggestion(query: string): Array<Record<string, unknown>> {
    return [
      { id: query },
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

  public async getSuggestion(message: SuggestionsMessage, id: string, cached = true, guild = true): Promise<SuggestionSchema> {
    let data: SuggestionSchema;
    const inCache = await this.client.redis.helpers.getCachedSuggestion(id);
    if (inCache && cached) {
      data = inCache;
    }

    if (!inCache && cached) {
      const fetched = await SuggestionModel.findOne({ $or: SuggestionHelpers._querySuggestion(id) });
      if (!fetched) throw new Error('SuggestionNotFound');
      await this.client.redis.helpers.setCachedSuggestion(fetched.id, fetched.message, fetched);
      data = fetched;
    }

    if (guild && (data.guild !== message.guildID)) throw new Error('GuildScope');

    return data;
  }

  public async createSuggestion(suggestion: Record<string, unknown>): Promise<SuggestionSchema> {
    const schema = new SuggestionModel(suggestion);
    const data = await schema.save();
    await this.client.redis.helpers.setCachedSuggestion(data.id, data.message, data);

    Logger.log(`Suggestion ${data.getSuggestionID(false)} created in the database.`);
    return data;
  }

  public async deleteSuggestion(id: string): Promise<boolean> {
    const deleted = await SuggestionModel.deleteOne({ $or: SuggestionHelpers._querySuggestion(id) });
    await this.client.redis.helpers.clearCachedSuggestion(id);
    return !!deleted.ok;
  }

  public async deleteSuggestions(guild: Guild|string): Promise<boolean> {
    const deleted = await SuggestionModel.deleteMany({ guild: Util.getGuildID(guild) });
    return !!deleted.ok;
  }
}
