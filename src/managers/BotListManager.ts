import SuggestionsClient from '../structures/Client';
import { Poster } from 'dbots';

export default class BotListManager {
  public poster: Poster;

  constructor(public client: SuggestionsClient) {
    this.client = client;
  }

  public init(): void {
    this.poster = new Poster({
      client: this.client,
      apiKeys: {
        discordbotsgg: process.env.BOTSGG,
        topgg: process.env.TOPGGTOKEN,
        discordappsdev: process.env.TERMTOKEN,
        discordbotlist: process.env.DBL2TOKEN,
        spacebotslist: process.env.BLSTOKEN,
        botsfordiscord: process.env.BFDTOKEN
      },
      clientLibrary: 'eris',
      serverCount: this.client.redis.helpers.getGuildCount,
      userCount: this.client.redis.helpers.getUserCount
    });
  }

  public start(enable = true): NodeJS.Timeout|void {
    enable ? this.poster.startInterval() : this.poster.stopInterval();
  }
}
