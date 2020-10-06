import { createClient } from 'redis';
import asyncRedis from 'async-redis';
import dotenv from 'dotenv';
import SuggestionsClient from '../../structures/Client';
import { Promisified } from '../../types';
import Logger from '../../utils/Logger';
import RedisHelpers from './helpers';
dotenv.config();

export default class Redis {
  public redis: Promisified;
  public helpers: RedisHelpers;

  constructor(public client: SuggestionsClient) {
    this.client = client;
    this.redis = null;
  }

  public init(): void {
    this.redis = asyncRedis.decorate(createClient({
      host: process.env.REDIS_HOSTNAME,
      password: process.env.REDIS_PASSWORD,
      port: +process.env.REDIS_PORT
    }));

    this.helpers = new RedisHelpers(this.client, this.redis);

    this.redis.on('ready', () => {
      Logger.ready('Redis connection successfully opened!');
    });
  }
}
