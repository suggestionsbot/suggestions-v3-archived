import Blacklist from '../models/blacklist';
import Util from '../../../utils/Util';
import { BlacklistQueryType, BlacklistSchema, SuggestionGuild, SuggestionUser } from '../../../types';
import Logger from '../../../utils/Logger';
import MongoDB from '../';

export default class BlacklistHelpers {
  constructor(database: MongoDB) {}

  async addBlacklist(blacklist: Record<string, unknown>): Promise<BlacklistSchema> {
    const document = new Blacklist(blacklist);
    const data = await document.save();

    Logger.log(`User ${document.user} blacklisted by ${document.issuer}`);
    return data;
  }

  async removeBlacklist(data: BlacklistQueryType): Promise<boolean> {
    const document = await Blacklist
      .findOne({ $and: data.query })
      .sort({ case: -1 });

    if (document === null) throw new Error('Could not remove the blacklist as it doesn\'t exist!');

    document.status = false;
    document.issuer = data.data.issuer;
    const saved = await document.save();

    Logger.log(`User ${document.user} blacklist removed by ${data.data.issuer}`);
    return saved.isModified();
  }

  async getBlacklists(user?: SuggestionUser, guild?: SuggestionGuild, status = false): Promise<Array<BlacklistSchema>> {
    return Blacklist.find({
      user: Util.getUserID(user!),
      guild: Util.getGuildID(guild!),
      status
    });
  }

  async getBlacklistCount(guild?: SuggestionGuild, status = false): Promise<number> {
    return Blacklist.find({ guild: Util.getGuildID(guild!) ?? null, status }).then(res => res.length);
  }

  async isUserBlacklisted(user: SuggestionUser, guild?: SuggestionGuild, cached = true): Promise<boolean> {
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
