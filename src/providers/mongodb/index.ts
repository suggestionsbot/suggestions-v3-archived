import mongoose from 'mongoose';

import SuggestionsClient from '../../structures/core/Client';
import MongoHelpers from './helpers';
import Redis from '../redis';

export default class MongoDB {
  connection!: mongoose.Connection;
  helpers!: MongoHelpers;

  constructor(public client: SuggestionsClient) {}

  async init(): Promise<void> {
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

    this.helpers = new MongoHelpers(this);
  }

  get redis(): Redis {
    return this.client.redis;
  }
}
