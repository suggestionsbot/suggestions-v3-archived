import { createClient } from 'redis';
import asyncRedis from 'async-redis';

import SuggestionsClient from '../../structures/Client';
import { Promisified } from '../../types';
import Logger from '../../utils/Logger';
import RedisHelpers from './helpers';

export default class Redis {
  public instance: Promisified|null;
  public helpers!: RedisHelpers;

  constructor(public client: SuggestionsClient) {
    this.instance = null;
  }

  public init(): void {
    this.instance = asyncRedis.decorate(createClient({
      host: process.env.REDIS_HOSTNAME,
      password: process.env.REDIS_PASSWORD,
      port: +process.env.REDIS_PORT!
    }));

    this.helpers = new RedisHelpers(this);

    this.instance.on('ready', () => {
      Logger.ready('Redis connection successfully opened!');
    });
  }
}
