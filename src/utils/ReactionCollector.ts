import { Message } from 'eris';
import { EventEmitter } from 'events';
// @ts-expect-error no typings exist for package
import { continuousReactionStream } from 'eris-reactions';

import SuggestionsClient from '../structures/core/Client';
import { AwaitReactionsOptions, CollectorFilter } from '../types';

export default class ReactionCollector extends EventEmitter {
  collected: Array<any>;
  running: boolean;
  handler: continuousReactionStream;
  ended?: boolean;

  constructor(
    public client: SuggestionsClient,
    public message: Message,
    public filter: CollectorFilter<any>,
    public options: AwaitReactionsOptions = {})
  {
    super();
    this.collected = [];
    this.running = false;
  }

  run(): Promise<this> {
    this.running = true;
    if (!this.running) this.setMaxListeners(this.getMaxListeners() + 1);
    const ReactionHandler = continuousReactionStream;
    return new Promise(res => {
      this.handler = new ReactionHandler(this.message, this.filter, !this.options.time && !this.options.max, { time: this.options.time, maxMatches: this.options.max });
      this.handler.client.setMaxListeners(this.handler.client.getMaxListeners() + 1);
      this.handler.setMaxListeners(this.handler.getMaxListeners() + 1);

      this.handler.on('reacted', (x: any) => {
        this.emit('collect', x);
        this.collected.push(x);
      });
      this.handler.once('end', (collected: Array<any>) => {
        this.collected = collected;
        this.stop();
        res(this);
      });
    });
  }

  stop(): void {
    if (this.running) this.setMaxListeners(this.getMaxListeners() - 1);
    this.running = false;

    if (this.handler) {
      this.handler.client.setMaxListeners(this.handler.client.getMaxListeners() - 1);
      if (!this.handler.ended) this.handler.stopListening('Called by user');
      this.handler.off('messageReactionAdd', this.handler.listener);
      this.handler.setMaxListeners(this.handler.getMaxListeners() - 1);
    }
  }
}
