import { EventEmitter } from 'events';
import { Message, TextableChannel, Collection } from 'eris';

import SuggestionsClient from '../structures/core/Client';
import { AwaitMessagesOptions, CollectorFilter } from '../types';
import Logger from './Logger';

export default class MessageCollector extends EventEmitter {
  collected: Collection<Message>;
  running: boolean;

  constructor(
    public client: SuggestionsClient,
    public channel: TextableChannel,
    public filter: CollectorFilter<Message>,
    public options: AwaitMessagesOptions = {})
  {
    super();
    this.collected = new Collection(Message);
    this.running = false;

    this.client.messageCollectors.push(this);

    this.onMessageCreate = this.onMessageCreate.bind(this);
    this.onMessageDelete = this.onMessageDelete.bind(this);
    this.onMessageUpdate = this.onMessageUpdate.bind(this);

    this.onCollect = this.onCollect.bind(this);
    this.onDelete = this.onDelete.bind(this);
    this.onUpdate = this.onUpdate.bind(this);
  }

  run(): Promise<this> {
    this.running = true;
    return new Promise((res) => {
      this.channel.client.setMaxListeners(this.getMaxListeners() + 1);
      this.channel.client.on('messageCreate', this.onMessageCreate);
      this.channel.client.on('messageUpdate', this.onMessageUpdate);
      this.channel.client.on('messageDelete', this.onMessageDelete);

      this.setMaxListeners(this.getMaxListeners() + 1);
      this.on('collect', this.onCollect);
      this.on('update', this.onUpdate);
      this.on('delete', this.onDelete);

      if (this.options.time) setTimeout(() => this.stop(), this.options.time);
      this.once('stop', () => res(this));
    });
  }

  stop(): this {
    this.running = false;
    this.channel.client.setMaxListeners(this.getMaxListeners() - 1);
    this.channel.client.off('messageCreate', this.onMessageCreate);
    this.channel.client.off('messageUpdate', this.onMessageUpdate);
    this.channel.client.off('messageDelete', this.onMessageDelete);

    this.setMaxListeners(this.getMaxListeners() - 1);
    this.off('collect', this.onCollect);
    this.off('update', this.onUpdate);
    this.off('delete', this.onDelete);
    this.emit('stop');
    return this;
  }

  onCollect(message: Message): void {
    this.collected.add(message);
    if (this.options.max && this.collected.size === this.options.max) this.stop();
  }

  onUpdate(message: Message): void {
    this.collected.update(message);
  }

  onDelete(message: Message): void {
    this.collected.remove(message);
  }

  private onMessageCreate(message: Message): void {
    if (!this.running) return;
    if (this.channel.id !== message.channel.id) return;
    if (!this.filter(message)) return;
    this.emit('collect', message);
  }

  private onMessageUpdate(message: Message, oldMessage: Message): Message|void|null|boolean {
    if (!this.running) return;
    if (this.channel.id !== message.channel.id) return;
    if (!this.filter(message)) return this.collected.remove(message);
    if (!this.collected.has(oldMessage.id)) return this.emit('collect', message);
    this.emit('update', message);
  }

  private onMessageDelete(message: Message): void {
    if (!this.running) return;
    if (!this.collected.has(message.id)) return;
    Logger.event('MESSAGE_DELETE', 'message was deleted');
    this.emit('delete', message);
  }
}
