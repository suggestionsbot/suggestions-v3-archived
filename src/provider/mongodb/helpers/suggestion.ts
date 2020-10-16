import SuggestionsClient from '../../../structures/Client';
import { Guild, Message } from 'eris';
import { SuggestionGuild, SuggestionSchema } from '../../../types';
import SuggestionModel from '../models/suggestion';
import Logger from '../../../utils/Logger';
import Util from '../../../utils/Util';

export default class SuggestionHelpers {
  constructor(public client: SuggestionsClient) {}

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

  public async getSuggestions(guild: SuggestionGuild, cached = true): Promise<Array<SuggestionSchema>|undefined> {
    let data: Array<SuggestionSchema>;

    const suggestions = await this.client.redis.helpers.getCachedSuggestions(guild);
    if (cached && suggestions) {
      data = suggestions;
    } else {
      const fetched = await SuggestionModel.find({ guild: Util.getGuildID(guild) });
      if (!fetched) throw new Error('SuggestionsNotFound');
      data = fetched;
    }

    return data;
  }

  public async getSuggestion(message: Message, id: string, cached = true, guild = true): Promise<SuggestionSchema|undefined> {
    let data: SuggestionSchema;
    const inCache = await this.client.redis.helpers.getCachedSuggestion(id);
    if (inCache && cached) {
      data = inCache;
    } else {
      const fetched = await SuggestionModel.findOne({ $or: SuggestionHelpers._querySuggestion(id) });
      if (!fetched) throw new Error('SuggestionNotFound');
      await this.client.redis.helpers.setCachedSuggestion(fetched.id, fetched.message, fetched);
      data = fetched;
    }

    if (guild && (data!.guild !== message.guildID)) throw new Error('GuildScope');

    return data;
  }

  public async createSuggestion(suggestion: Record<string, unknown>): Promise<SuggestionSchema> {
    const schema = new SuggestionModel(suggestion);
    const data = await schema.save();
    await this.client.redis.helpers.setCachedSuggestion(data.id, data.message, data);
    this.client.redis.redis!.incrby(`guild:${data.guild}:member:${data.user}:suggestions:count`, 1);
    this.client.redis.redis!.incrby(`guild:${data.guild}:suggestions:count`, 1);

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
