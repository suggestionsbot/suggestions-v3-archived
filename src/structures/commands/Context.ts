import {
  EmbedOptions,
  Guild,
  Member, Message, Shard,
  TextableChannel,
  TextChannel,
  User
} from 'eris';

import SuggestionsClient from '../core/Client';
import { DMOptions, GuildSchema, Promisified } from '../../types';
import Language from '../core/Language';
import ArgumentParser from '../parsers/ArgumentParser';
import FlagParser from '../parsers/FlagParser';

export default class CommandContext {
  public args: ArgumentParser;
  public flags: FlagParser;
  public local?: any;

  constructor(
    public message: Message,
    args: Array<string>,
    public locale: Language|undefined,
    public settings: GuildSchema|undefined
  ) {
    this.args = new ArgumentParser(args);
    this.flags = new FlagParser(args);
  }

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
    const mentionCheck = this.guild ? this.me!.mention : this.client.user.mention;
    return this.message.prefix!.trim() === mentionCheck.trim() ?
      `@${this.client.user.tag} ` :
      this.message.prefix!;
  }

  public get client(): SuggestionsClient {
    return <SuggestionsClient>this.channel.client;
  }

  public get guild(): Guild|undefined {
    return (this.message.channel instanceof TextChannel) ?
      this.message.channel.guild : undefined;
  }

  public get channel(): TextableChannel {
    return this.message.channel;
  }

  public get sender(): User {
    return this.message.author;
  }

  public get member(): Member|undefined {
    return this.guild ? this.guild.members.get(this.sender.id) : undefined;
  }

  public get me(): Member|undefined {
    return this.guild ? this.guild.members.get(this.client.user.id) : undefined;
  }

  public getSettings(cached?: boolean): Promise<GuildSchema>|null {
    return this.guild ? this.client.database.helpers.guild.getGuild(this.guild.id, cached) : null;
  }

  public translate(key: string, args?: { [x: string]: any}): string {
    return this.locale ? this.locale.translate(key, args) : 'Failed translation.';
  }

  public sendTranslate(key: string, args?: { [x: string]: any}): Promise<Message> {
    return this.send(this.translate(key, args));
  }

  public get redis(): Promisified|null {
    return this.client.redis.instance;
  }

  public async dm(options: DMOptions): Promise<Message> {
    return options.user.createMessage(
      { content: options.content, embed: options.embed },
      options.file
    );
  }

  public get shard(): Shard|undefined {
    return this.guild ? this.guild.shard : this.client.shards.get(0);
  }
}
