import {
  EmbedOptions,
  Guild,
  GuildTextableChannel,
  Member, Message, Shard,
  TextableChannel,
  TextChannel,
  User
} from 'eris';

import SuggestionsClient from './Client';
import { DMOptions, GuildSchema, Promisified } from '../types';
import Language from './Language';

export default class Context {
  constructor(
    public client: SuggestionsClient,
    public message: Message,
    public args: Array<string>,
    public locale: Language|undefined,
    public settings: GuildSchema|undefined
  ) {}

  public send(content: string): Promise<Message> {
    return this.message.channel.createMessage({
      content,
      allowedMentions: {
        everyone: false,
        users: true,
        roles: true
      }
    });
  }

  public embed(content: EmbedOptions): Promise<Message> {
    return this.message.channel.createMessage({ embed: content });
  }

  public code(lang: string, content: string): Promise<Message> {
    const cb = '```';
    return this.send(`${cb + lang}\n${content + cb}`);
  }

  public get prefix(): string {
    return this.message.prefix;
  }

  public get guild(): Guild {
    return (this.message.channel instanceof TextChannel) ?
      this.message.channel.guild : undefined;
  }

  public get channel(): TextableChannel {
    return this.message.channel;
  }

  public get sender(): User {
    return this.message.author;
  }

  public get member(): Member {
    return this.guild ? this.guild.members.get(this.sender.id) : undefined;
  }

  public get me(): Member {
    return this.guild ? this.guild.members.get(this.client.user.id) : undefined;
  }

  public getSettings(): Promise<GuildSchema> {
    return this.guild ? this.client.database.guildHelpers.getGuild(this.guild.id) : null;
  }

  public translate(key: string, args?: { [x: string]: any}): string {
    return this.locale ? this.locale.translate(key, args) : 'Failed translation.';
  }

  public sendTranslate(key: string, args?: { [x: string]: any}): Promise<Message> {
    return this.send(this.translate(key, args));
  }

  public get redis(): Promisified {
    return this.client.redis.redis;
  }

  public async dm(options: DMOptions): Promise<Message> {
    const channel = await options.user.getDMChannel();
    return channel.createMessage({
      content: options.content,
      embed: options.embed
    });
  }

  public get shard(): Shard {
    return this.guild ? this.guild.shard : this.client.shards.get(0);
  }
}
