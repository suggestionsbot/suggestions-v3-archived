import { EventEmitter } from 'events';
import { Message, TextableChannel, Collection } from 'eris';

import SuggestionsClient from '../structures/core/Client';
import { AwaitMessagesOptions, CollectorFilter } from '../types';
import Logger from './Logger';

export default class MessageCollector extends EventEmitter {
  public collected: Collection<Message>;
  public running: boolean;

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

    this._onMessageCreate = this._onMessageCreate.bind(this);
    this._onMessageDelete = this._onMessageDelete.bind(this);
    this._onMessageUpdate = this._onMessageUpdate.bind(this);

    this.onCollect = this.onCollect.bind(this);
    this.onDelete = this.onDelete.bind(this);
    this.onUpdate = this.onUpdate.bind(this);
  }

  public run(): Promise<this> {
    this.running = true;
    return new Promise((res) => {
      this.channel.client.setMaxListeners(this.getMaxListeners() + 1);
      this.channel.client.on('messageCreate', this._onMessageCreate);
      this.channel.client.on('messageUpdate', this._onMessageUpdate);
      this.channel.client.on('messageDelete', this._onMessageDelete);

      this.setMaxListeners(this.getMaxListeners() + 1);
      this.on('collect', this.onCollect);
      this.on('update', this.onUpdate);
      this.on('delete', this.onDelete);

      if (this.options.time) setTimeout(() => this.stop(), this.options.time);
      this.once('stop', () => res(this));
    });
  }

  public stop(): this {
    this.running = false;
    this.channel.client.setMaxListeners(this.getMaxListeners() - 1);
    this.channel.client.off('messageCreate', this._onMessageCreate);
    this.channel.client.off('messageUpdate', this._onMessageUpdate);
    this.channel.client.off('messageDelete', this._onMessageDelete);

    this.setMaxListeners(this.getMaxListeners() - 1);
    this.off('collect', this.onCollect);
    this.off('update', this.onUpdate);
    this.off('delete', this.onDelete);
    this.emit('stop');
    return this;
  }

  public onCollect(message: Message): void {
    this.collected.add(message);
    if (this.options.max && this.collected.size === this.options.max) this.stop();
  }

  public onUpdate(message: Message): void {
    this.collected.update(message);
  }

  public onDelete(message: Message): void {
    this.collected.remove(message);
  }

  private _onMessageCreate(message: Message): void {
    if (!this.running) return;
    if (this.channel.id !== message.channel.id) return;
    if (!this.filter(message)) return;
    this.emit('collect', message);
  }

  private _onMessageUpdate(message: Message, oldMessage: Message): Message|void|boolean {
    if (!this.running) return;
    if (this.channel.id !== message.channel.id) return;
    if (!this.filter(message)) return this.collected.remove(message);
    if (!this.collected.has(oldMessage.id)) return this.emit('collect', message);
    this.emit('update', message);
  }

  private _onMessageDelete(message: Message): void {
    if (!this.running) return;
    if (!this.collected.has(message.id)) return;
    Logger.event('MESSAGE_DELETE', 'message was deleted');
    this.emit('delete', message);
  }
}
