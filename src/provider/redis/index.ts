import { createClient } from 'redis';
import asyncRedis from 'async-redis';
import dotenv from 'dotenv';
import SuggestionsClient from '../../structures/client';
import { Promisified } from '../../types';
import Logger from '../../utils/Logger';
dotenv.config();

export default class Redis {
  public redis: Promisified;

  constructor(public client: SuggestionsClient) {
    this.client = client;
  }

  public init(): void {
    this.redis = asyncRedis.decorate(createClient({
      host: process.env.REDIS_HOSTNAME,
      password: process.env.REDIS_PASSWORD,
      port: parseInt(process.env.REDIS_PORT)
    }));

    this.redis.on('ready', () => {
      Logger.ready('Redis connection successfully opened!');
    });
  }
}
