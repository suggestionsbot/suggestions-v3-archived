import MongoDB from '../';
import GuildHelpers from './guild';
import SuggestionHelpers from './suggestion';
import BlacklistHelpers from './blacklist';
import ActionLogHelpers from './actionlog';
import UserHelpers from './user';

export default class MongoHelpers {
  public guild!: GuildHelpers;
  public suggestion!: SuggestionHelpers;
  public blacklist!: BlacklistHelpers;
  public actionlog!: ActionLogHelpers;
  public user!: UserHelpers;

  constructor(public mongo: MongoDB) {
    this.guild = new GuildHelpers(mongo);
    this.suggestion = new SuggestionHelpers(mongo);
    this.blacklist = new BlacklistHelpers(mongo);
    this.actionlog = new ActionLogHelpers(mongo);
    this.user = new UserHelpers(mongo);
  }
}
