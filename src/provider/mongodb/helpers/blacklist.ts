import SuggestionsClient from '../../../structures/Client';
import Blacklist from '../models/blacklist';
import Util from '../../../utils/Util';
import { BlacklistQueryType, BlacklistSchema, SuggestionGuild, SuggestionUser } from '../../../types';
import Logger from '../../../utils/Logger';

export default class BlacklistHelpers {
  constructor(public client: SuggestionsClient) {}

  public async addBlacklist(blacklist: Record<string, unknown>): Promise<BlacklistSchema> {
    const document = new Blacklist(blacklist);
    const data = await document.save();
    await this.client.redis.helpers.setCachedBlacklist(data.id, data, document.guild);

    Logger.log(`User ${document.user} blacklisted by ${document.issuer}`);
    return data;
  }

  public async removeBlacklist(data: BlacklistQueryType): Promise<boolean> {
    const document = await Blacklist
      .findOne({ $and: data.query })
      .sort({ case: -1 });

    if (document === null) throw new Error('Could not remove the blacklist as it doesn\'t exist!');

    document.status = false;
    document.issuer = data.data.issuer;
    const saved = await document.save();
    await this.client.redis.helpers.clearCachedBlacklist(document.user, document.guild);

    Logger.log(`User ${document.user} blacklist removed by ${data.data.issuer}`);
    return saved.isModified();
  }

  public async getBlacklists(user?: SuggestionUser, guild?: SuggestionGuild, status = false): Promise<Array<BlacklistSchema>> {
    return Blacklist.find({
      user: Util.getUserID(user!),
      guild: Util.getGuildID(guild!),
      status
    });
  }

  public async getBlacklistCount(guild?: SuggestionGuild, status = false): Promise<number> {
    return Blacklist.find({ guild: Util.getGuildID(guild!) ?? null, status }).then(res => res.length);
  }

  public async isUserBlacklisted(user: SuggestionUser, guild?: SuggestionGuild, cached = true): Promise<boolean> {
    if (cached) return this.client.redis.helpers.getCachedBlacklist(user, guild).then(res => res.status);
    return Blacklist.findOne({
      $and: [
        { guild: Util.getGuildID(guild!) ?? null },
        { user: Util.getUserID(user) },
        { status: true }
      ]
    })
      .sort({ case: -1 })
      .then(res => res!.status);
  }
}
