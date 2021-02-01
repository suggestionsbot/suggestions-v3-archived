import { Poster } from 'dbots';

import SuggestionsClient from '../structures/core/Client';

export default class BotListManager {
  poster!: Poster;

  constructor(public client: SuggestionsClient) {}

  init(): void {
    this.poster = new Poster({
      client: this.client,
      apiKeys: {
        discordbotsgg: process.env.BOTSGG!,
        topgg: process.env.TOPGGTOKEN!,
        discordappsdev: process.env.TERMTOKEN!,
        discordbotlist: process.env.DBL2TOKEN!,
        spacebotslist: process.env.BLSTOKEN!,
        botsfordiscord: process.env.BFDTOKEN!
      },
      clientLibrary: 'eris',
      serverCount: this.client.redis.helpers.getGuildCount,
      userCount: this.client.redis.helpers.getUserCount
    });
  }

  start(enable = true): number | void {
    return enable ? this.poster.startInterval() : this.poster.stopInterval();
  }
}
