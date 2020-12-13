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

    const suggestions = await this.database.client.redis.helpers.getCachedSuggestions(guild);
    if (cached && suggestions) {
      data = suggestions;
    } else {
      const fetched = await SuggestionModel.find({ guild: Util.getGuildID(guild) });
      if (!fetched) throw new Error('SuggestionsNotFound');
      data = fetched;
    }

    return data;
  }

  public async getSuggestion(guildID: string, id: string, cached = true, guild = true): Promise<SuggestionSchema|undefined> {
    let data: SuggestionSchema;
    const inCache = await this.database.client.redis.helpers.getCachedSuggestion(id);
    if (inCache && cached) {
      data = inCache;
    } else {
      const fetched = await SuggestionModel.findOne({ $or: SuggestionHelpers._querySuggestion(id) });
      if (!fetched) throw new Error('SuggestionNotFound');
      await this.database.client.redis.helpers.setCachedSuggestion(fetched);
      data = fetched;
    }

    if (guild && (data!.guild !== guildID)) throw new Error('GuildScope');

    return data;
  }

  public async createSuggestion(suggestion: Record<string, unknown>): Promise<SuggestionSchema> {
    const schema = new SuggestionModel(suggestion);
    const data = await schema.save();
    await this.database.client.redis.helpers.setCachedSuggestion(data);
    this.database.client.redis.instance!.incrby(`guild:${data.guild}:member:${data.user}:suggestions:count`, 1);
    this.database.client.redis.instance!.incrby(`user:${data.user}:suggestions:count`, 1);
    this.database.client.redis.instance!.incrby(`guild:${data.guild}:suggestions:count`, 1);
    this.database.client.redis.instance!.incrby(`guild:${data.guild}:channel:${data.channel}:suggestions:count`, 1);
    this.database.client.redis.instance!.incrby('global:suggestions', 1);

    Logger.log(`Suggestion ${data.getSuggestionID(false)} created in the database.`);
    return data;
  }

  public async deleteSuggestion(id: string): Promise<boolean> {
    const deleted = await SuggestionModel.deleteOne({ $or: SuggestionHelpers._querySuggestion(id) });
    await this.database.client.redis.helpers.clearCachedSuggestion(id);
    return !!deleted.ok;
  }

  public async deleteSuggestions(guild: Guild|string): Promise<boolean> {
    const deleted = await SuggestionModel.deleteMany({ guild: Util.getGuildID(guild) });
    return !!deleted.ok;
  }

  public async cacheAllGuildSuggestions(guild: SuggestionGuild): Promise<void> {
    return SuggestionModel.find({ guild: Util.getGuildID(guild) }).then(async documents => {
      if (!documents) return;
      for (const document of documents) await this.database.client.redis.helpers.setCachedSuggestion(document);
    });
  }
}
