import mongoose from 'mongoose';
import dotenv from 'dotenv';

import SuggestionsClient from '../../structures/Client';
import GuildHelpers from './helpers/guild';
import SuggestionHelpers from './helpers/suggestion';
import CommandHelpers from './helpers/command';
import BlacklistHelpers from './helpers/blacklist';
dotenv.config();

export default class MongoDB {
  public connection: mongoose.Connection;
  public guildHelpers: GuildHelpers;
  public suggestionHelpers: SuggestionHelpers;
  public commandHelpers: CommandHelpers;
  public blacklistHelpers: BlacklistHelpers;

  constructor(public client: SuggestionsClient) {
    this.client = client;
    this.connection = null;
  }

  public async init(): Promise<void> {
    this.guildHelpers = new GuildHelpers(this.client);
    this.suggestionHelpers = new SuggestionHelpers(this.client);
    this.commandHelpers = new CommandHelpers(this.client);
    this.blacklistHelpers = new BlacklistHelpers(this.client);

    const dbOptions = {
      useNewUrlParser: true,
      autoIndex: false,
      poolSize: 5,
      connectTimeoutMS: 10000,
      useUnifiedTopology: true
    };

    const connected = await mongoose.connect(process.env.MONGO_URI, dbOptions);
    mongoose.set('useFindAndModify', false);
    if (connected) this.connection = connected.connection;
  }

}
