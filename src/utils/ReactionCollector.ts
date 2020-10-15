import { Message } from 'eris';
import { EventEmitter } from 'events';

import { continuousReactionStream } from 'eris-reactions';

import SuggestionsClient from '../structures/Client';
import { AwaitReactionsOptions, CollectorFilter } from '../types';

export default class ReactionCollector extends EventEmitter {
  public collected: Array<any>;
  public running: boolean;
  public handler: continuousReactionStream;
  public ended: boolean;

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

  public run(): Promise<this> {
    this.running = true;
    if (!this.running) this.setMaxListeners(this.getMaxListeners() + 1);
    const ReactionHandler = continuousReactionStream;
    return new Promise(res => {
      this.handler = new ReactionHandler(this.message, this.filter, !this.options.time && !this.options.max, { time: this.options.time, maxMatches: this.options.max });
      this.handler.client.setMaxListeners(this.handler.client.getMaxListeners() + 1);
      this.handler.setMaxListeners(this.handler.getMaxListeners() + 1);

      this.handler.on('reacted', x => {
        this.emit('collect', x);
        this.collected.push(x);
      });
      this.handler.once('end', collected => {
        this.collected = collected;
        this.stop();
        res(this);
      });
    });
  }

  public stop(): void {
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
