import mongoose from 'mongoose';

import SuggestionsClient from '../../structures/Client';
import GuildHelpers from './helpers/guild';
import SuggestionHelpers from './helpers/suggestion';
import CommandHelpers from './helpers/command';
import BlacklistHelpers from './helpers/blacklist';

export default class MongoDB {
  public connection: mongoose.Connection|null;
  public guildHelpers!: GuildHelpers;
  public suggestionHelpers!: SuggestionHelpers;
  public commandHelpers!: CommandHelpers;
  public blacklistHelpers!: BlacklistHelpers;

  constructor(public client: SuggestionsClient) {
    this.connection = null;
  }

  public async init(): Promise<void> {
    this.guildHelpers = new GuildHelpers(this);
    this.suggestionHelpers = new SuggestionHelpers(this);
    this.commandHelpers = new CommandHelpers(this);
    this.blacklistHelpers = new BlacklistHelpers(this);

    const dbOptions = {
      useNewUrlParser: true,
      autoIndex: false,
      poolSize: 5,
      connectTimeoutMS: 10000,
      useUnifiedTopology: true
    };

    const connected = await mongoose.connect(process.env.MONGO_URI!, dbOptions);
    mongoose.set('useFindAndModify', false);
    if (connected) this.connection = connected.connection;
  }

}
