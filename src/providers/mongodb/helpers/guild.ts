import GuildModel from '../models/guild';
import { GuildSchema, SuggestionGuild } from '../../../types';
import Logger from '../../../utils/Logger';
import Util from '../../../utils/Util';
import MongoDB from '../';

/**
 * TODO look into TTL and how long data should be kept in cache (could keep only active guilds in cache longer than inactive)
 *
 */
export default class GuildHelpers {
  constructor(public database: MongoDB) {}

  // TODO make sure default data isn't be saved to database. only persist if a config value was changed
  async getGuild(guild: SuggestionGuild, cached = true): Promise<GuildSchema> {
    const guildID = Util.getGuildID(guild);
    let data;
    const defaultData = <GuildSchema><unknown>{
      ...this.database.client.config.defaults.guild,
      guild: guildID,
      default: true
    };

    const inCache = cached && await this.database.client.redis.helpers.getCachedGuild(guild);
    if (inCache) data = inCache;
    else {
      const fetched = await GuildModel.findOne({ guild: guildID });
      if (!fetched) return this.createGuild(guild, defaultData);
      await this.database.redis.helpers.setCachedGuild(guild, fetched);
      data = fetched;
    }

    return <GuildSchema>data;
  }

  async createGuild(guild: SuggestionGuild, newData = {}): Promise<GuildSchema> {
    const guildID = Util.getGuildID(guild);
    // TODO make sure to test this (+ empty emojis array we're passing through)
    const schema = new GuildModel(Object.assign({ guild: guildID, emojis: [] }, newData));

    const data = await schema.save();
    await this.database.redis.helpers.setCachedGuild(guild, data);

    Logger.log(`Guild settings saved for Guild ${guildID}`);
    return data;
  }

  async deleteGuild(guild: SuggestionGuild): Promise<boolean> {
    await GuildModel.deleteOne({ guild: Util.getGuildID(guild) });
    await this.database.redis.helpers.clearCachedGuild(guild);
    return true;
  }
}
