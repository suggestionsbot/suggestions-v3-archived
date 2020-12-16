import MongoDB from '../';
import GuildHelpers from './guild';
import SuggestionHelpers from './suggestion';
import CommandHelpers from './command';
import BlacklistHelpers from './blacklist';

export default class MongoHelpers {
  public guild!: GuildHelpers;
  public suggestion!: SuggestionHelpers;
  public command!: CommandHelpers;
  public blacklist!: BlacklistHelpers;

  constructor(public mongo: MongoDB) {
    this.guild = new GuildHelpers(mongo);
    this.suggestion = new SuggestionHelpers(mongo);
    this.command = new CommandHelpers(mongo);
    this.blacklist = new BlacklistHelpers(mongo);
  }
}
