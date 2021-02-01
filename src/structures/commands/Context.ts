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
  args: ArgumentParser;
  flags: FlagParser;
  local?: any;

  constructor(
    public message: Message,
    args: Array<string>,
    public locale: Language|undefined,
    public settings: GuildSchema|undefined
  ) {
    this.args = new ArgumentParser(args);
    this.flags = new FlagParser(args);
  }

  send(content: string): Promise<Message> {
    return this.message.channel.createMessage({
      content,
      allowedMentions: {
        everyone: false,
        users: true,
        roles: true
      }
    });
  }

  embed(content: EmbedOptions): Promise<Message> {
    return this.message.channel.createMessage({ embed: content });
  }

  code(lang: string, content: string): Promise<Message> {
    const cb = '```';
    return this.send(`${cb + lang}\n${content + cb}`);
  }

  get prefix(): string {
    const mentionCheck = this.guild ? this.me!.mention : this.client.user.mention;
    return this.message.prefix!.trim() === mentionCheck.trim() ?
      `@${this.client.user.tag} ` :
      this.message.prefix!;
  }

  get client(): SuggestionsClient {
    return <SuggestionsClient>this.channel.client;
  }

  get guild(): Guild|undefined {
    return (this.message.channel instanceof TextChannel) ?
      this.message.channel.guild : undefined;
  }

  get channel(): TextableChannel {
    return this.message.channel;
  }

  get sender(): User {
    return this.message.author;
  }

  get member(): Member|undefined {
    return this.guild ? this.guild.members.get(this.sender.id) : undefined;
  }

  get me(): Member|undefined {
    return this.guild ? this.guild.members.get(this.client.user.id) : undefined;
  }

  getSettings(cached?: boolean): Promise<GuildSchema>|null {
    return this.guild ? this.client.database.helpers.guild.getGuild(this.guild.id, cached) : null;
  }

  translate(key: string, args?: { [x: string]: any}): string {
    return this.locale ? this.locale.translate(key, args) : 'Failed translation.';
  }

  sendTranslate(key: string, args?: { [x: string]: any}): Promise<Message> {
    return this.send(this.translate(key, args));
  }

  get redis(): Promisified|null {
    return this.client.redis.instance;
  }

  async dm(options: DMOptions): Promise<Message> {
    return options.user.createMessage(
      { content: options.content, embed: options.embed },
      options.file
    );
  }

  get shard(): Shard|undefined {
    return this.guild ? this.guild.shard : this.client.shards.get(0);
  }
}
