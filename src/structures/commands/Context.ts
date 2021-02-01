import {
  AdvancedMessageContent,
  EmbedOptions,
  Guild,
  Member, Message, MessageContent, Shard,
  TextableChannel,
  TextChannel,
  User
} from 'eris';

import SuggestionsClient from '../core/Client';
import { GuildSchema, Promisified } from '../../types';
import Language from '../core/Language';
import ArgumentParser from '../parsers/ArgumentParser';
import FlagParser from '../parsers/FlagParser';
import CodeBlock from '../../utils/CodeBlock';
import { ALLOWED_MENTIONS } from '../../utils/Constants';

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

  send(content: string, options?: AdvancedMessageContent): Promise<Message> {
    return this.message.channel.createMessage({
      ...options,
      content,
      allowedMentions: ALLOWED_MENTIONS
    });
  }

  embed(content: EmbedOptions, options?: AdvancedMessageContent): Promise<Message> {
    return this.message.channel.createMessage({
      ...options,
      embed: content,
      allowedMentions: ALLOWED_MENTIONS
    });
  }

  code(lang: string, content: string): Promise<Message> {
    return this.send(new CodeBlock(content, lang).toString());
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

  async dm(user: User, options: AdvancedMessageContent): Promise<Message> {
    return user.createMessage({ ...options, allowedMentions: ALLOWED_MENTIONS });
  }

  get shard(): Shard|undefined {
    return this.guild ? this.guild.shard : this.client.shards.get(0);
  }
}
