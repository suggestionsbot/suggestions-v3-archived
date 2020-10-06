import { Guild } from 'eris';

import GuildModel from '../models/guild';
import SuggestionsClient from '../../../structures/Client';
import { GuildSchema, SuggestionGuild } from '../../../types';
import Logger from '../../../utils/Logger';
import Util from '../../../utils/Util';

/**
 * TODO look into TTL and how long data should be kept in cache (could keep only active guilds in cache longer than inactive)
 *
 */
export default class GuildHelpers {
  constructor(public client: SuggestionsClient) {
    this.client = client;
  }

  private static _getGuildID(guild: SuggestionGuild): string {
    return guild instanceof Guild ? guild.id : guild;
  }

  // TODO make sure default data isn't be saved to database. only persist if a config value was changed
  public async getGuild(guild: SuggestionGuild, cached = true): Promise<GuildSchema> {
    const guildID = GuildHelpers._getGuildID(guild);
    const defaultData = <GuildSchema><unknown>{
      guild: guildID,
      ...this.client.config.defaults
    };
    let data: GuildSchema;

    const inCache = await this.client.redis.helpers.getCachedGuild(guild);
    if (inCache && cached) {
      data = inCache;
    } else {
      const fetched = await GuildModel.findOne({ guild: guildID });
      if (!fetched) return defaultData;
      await this.client.redis.helpers.setCachedGuild(guild, fetched);
      data = fetched;
    }

    if (!cached) data = await GuildModel.findOne({ guild: guildID });

    return data;
  }

  public async createGuild(guild: SuggestionGuild, newData = {}): Promise<GuildSchema> {
    const guildID = GuildHelpers._getGuildID(guild);
    const schema = new GuildModel(Object.assign({ guild: guildID }, newData));

    const data = await schema.save();
    await this.client.redis.helpers.setCachedGuild(guild, data);

    Logger.log(`Guild settings saved for Guild ${guildID}`);
    return data;
  }

  public async deleteGuild(guild: SuggestionGuild): Promise<boolean> {
    await GuildModel.deleteMany({ guild: Util.getGuildID(guild) });
    await this.client.redis.helpers.clearCachedGuild(guild);
    return true;
  }
}
