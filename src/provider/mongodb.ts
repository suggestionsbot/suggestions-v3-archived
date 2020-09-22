import mongoose from 'mongoose';
import dotenv from 'dotenv';

import SuggestionsClient from '../structures/client';
dotenv.config();

export default class MongoDB {
  public connection: mongoose.Connection;

  constructor(public client: SuggestionsClient) {
    this.client = client;
    this.connection = null;
  }

  public async init(): Promise<void> {
    const dbOptions = {
      useNewUrlParser: true,
      autoIndex: false,
      poolSize: 5,
      connectTimeoutMS: 10000,
      useUnifiedTopology: true
    };

    await mongoose.connect(process.env.MONGO_URI, dbOptions);
    mongoose.set('useFindAndModify', false);
  }

}
