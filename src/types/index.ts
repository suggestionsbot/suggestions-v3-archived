import { BotActivityType, EmbedOptions, Guild, Member, Message, User } from 'eris';
import { Commands, RedisClient } from 'redis';
import { Document } from 'mongoose';

import SuggestionsClient from '../structures/Client';
import Context from '../structures/Context';
import { Collection } from '@augu/immutable';
import Ratelimit from '../structures/Ratelimit';

export interface EmbedThumbnail {
  url: string;
}

export interface BotConfig {
  prefixes: Array<string>;
  owners: Array<string>;
  discord: string;
  website: string;
  docs: string;
  invite: string;
  github: string;
  colors: {
    main: number;
    suggestion: {
      approved: number;
      rejected: number;
    };
    guild: {
      created: number;
      deleted: number;
    };
  };
  emojis: {
    success: string;
    error: string;
  };
  voteSites: Array<VoteSite>;
  patreon: string;
  superSecretUsers: Array<string>;
  permissions: {
    default: number;
    logs: number;
    staff: number;
  };
  defaults: {
    prefixes: Array<string>;
    channels: {
      channel: string;
      type: string;
    };
    locale: string;
  }
}

export interface VoteSite {
  name: string;
  link: string;
  voted: boolean;
}

export abstract class Command {
  public name!: string;
  public description!: string;
  public category!: CommandCategory;
  public checks?: Array<string>;
  public subCommands?: Array<string>;
  public usages?: Array<string>;
  public examples?: Array<string>;
  public aliases?: Array<string>;
  public active?: boolean;
  public guarded?: boolean;
  public guildOnly!: boolean;
  public staffOnly?: boolean;
  public adminOnly?: boolean;
  public ownerOnly?: boolean;
  public superOnly?: boolean;
  public botPermissions?: Array<string|number>;
  public userPermissions?: Array<string|number>;
  public throttles!: CommandThrottling;
  public ratelimiter?: Collection<Ratelimit>;
  protected constructor(public client: SuggestionsClient) {}
  public abstract async run(ctx: Context): Promise<any>;
  public async runPreconditions?(ctx: Context, next: CommandNextFunction): Promise<any>;
  public async runPostconditions?(ctx: Context, next: CommandNextFunction): Promise<any>;
}

export abstract class SubCommand extends Command {
  public parent!: string;
  public arg!: string;
  public friendly!: string;
}

export type SuggestionsCommand = Command|SubCommand;

export interface CommandThrottle {
  start: number;
  usages: number;
  timeout: NodeJS.Timeout;
}

export interface CommandThrottling {
  usages: number;
  max: number;
  duration: number;
}

export type CommandNextFunction = () => void;

export abstract class Event {
  protected constructor(public client?: SuggestionsClient, public name?: string, public options: EventOptions = {}) {}
  public abstract run(...args: Array<any>): Promise<any>;
}

export type EventConstructor<T> = new (...args: never[]) => T;

export interface EventOptions {
  once?: boolean;
  emitter?: SuggestionsClient|string;
}

export type CollectorFilter<T> = (...args: Array<T>) => boolean;

export interface CollectorOptions {
  time?: number;
  idle?: number;
  dispose?: number;
}

export interface MessageCollectorOptions extends CollectorOptions {
  max?: number;
  maxProcessed?: number;
}

export interface ReactionCollectorOptions extends CollectorOptions {
  max?: number;
  maxEmojis?: number;
  maxUsers?: number;
}

export interface AwaitMessagesOptions extends MessageCollectorOptions {
  errors?: readonly string[];
}

export interface AwaitReactionsOptions extends ReactionCollectorOptions {
  errors?: readonly string[];
}

export interface AwaitReply {
  originMsg: Message;
  reply: Message;
}

export interface GuildSchema extends Document {
  guild: string,
  prefixes: Array<string>;
  locale: string;
  channels: Array<SuggestionChannel>;
  staffRoles: Array<string>;
  voteEmojis: string;
  responseRequired: boolean;
  dmResponses: boolean;
  disabledCommands: Array<DisabledCommand>;
  setEmojis(id: string): void;
  setGuild(guild: Guild|string): void;
  setLocale(locale: string): void;
  updatePrefixes(prefix: string): void;
  updateChannel(channel: string, data: Record<string, unknown>): void;
  updateChannels(channel: SuggestionChannel): void;
  updateCommands(command: DisabledCommand): void;
  updateStaffRoles(role: string): void;
  updateChannelRoles(channel: string, role: string, type: 'allowed'|'blocked'): void;
}

export interface SuggestionChannel extends Document {
  channel: string;
  type: SuggestionChannelType;
  allowed: Array<string>;
  blocked: Array<string>;
  locked: boolean;
  reviewMode: boolean;
  added: number;
  addedBy: string;
}

export enum SuggestionChannelType {
  SUGGESTIONS = 'suggestions',
  LOGS = 'logs',
  STAFF = 'staff',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface DisabledCommand extends Document {
  command: string;
  added: number;
  addedBy: string;
}

export interface VoteEmoji extends Document {
  emojis: VoteEmojiArray;
  added: number;
  addedBy: string;
}

export type VoteEmojiArray = [string, string, string?];

export interface SuggestionSchema extends Document {
  guild: string;
  channel: string;
  message: string;
  user: string;
  suggestion: string;
  id: string;
  type: SuggestionType;
  time: number;
  results: ResultEmoji;
  statusUpdates: Array<StatusUpdates>;
  voted: Array<VoteResult>;
  notes: Array<Note>;
  edits: Array<Edit>;
  getMessageLink(args: MessageLinkFormatter): string;
  getSuggestionID(long: boolean): string;
}

export type StatusReply = Document;

export interface StatusUpdates extends Document {
  status: string;
  response: string;
  time: number;
  updatedBy: string;
}

export interface Note extends Document {
  note: string;
  addedBy: string;
  time: number;
}

export interface Edit extends Document {
  edit: string;
  editedBy: string;
  edited: number;
}

export interface ResultEmoji extends Document {
  emoji: string;
  result: number;
}

export interface VoteResult extends Document {
  emoji: string;
  voted: Array<string>;
}

export enum SuggestionType {
  REGULAR = 'regular',
  STAFF = 'staff'
}

export interface BlacklistSchema extends Document {
  guild: string;
  user: string;
  reason: string;
  issuer: string;
  time: number;
  status: boolean;
  case: number;
  scope: BlacklistScope;
}

export enum BlacklistScope {
  GUILD = 'guild',
  GLOBAL = 'global'
}

export interface CommandSchema extends Document {
  guild: string;
  channel: string;
  message: string;
  command: string;
  user: string;
  time: number;
}

export type MessageLinkFormatter = [string, string, string];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface Promisified<T = RedisClient>
  extends Omitted,
  Commands<Promise<boolean>> {}

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

type Omitted = Omit<RedisClient, keyof Commands<boolean>>;

export type SuggestionUser = User|Member|string;
export type SuggestionGuild = Guild|string;
export type BlacklistQuery = [{ user: string }, { status: boolean }];

interface BlacklistData {
  status: boolean;
  issuer: string;
}

export interface BlacklistQueryType {
  query: BlacklistQuery;
  data: BlacklistData;
}

export interface ShardStats {
  guilds: number;
  users: number;
  totalRam: number;
  voice: number;
  exclusiveGuilds: number;
  largeGuilds: number;
  clusters: Array<ErisSharderCluster>;
}

export interface ErisSharderCluster {
  cluster: number;
  shards: number;
  guilds: number;
  ram: number;
  voice: number;
  uptime: number;
  exclusiveGuilds: number;
  largeGuilds: number;
  shardsStats: Array<ErisSharderShard>;
}

export interface ErisSharderShard {
  id: number;
  ready: boolean;
  latency: number;
  status: string;
}

export enum LanguageStatus {
  INCOMPLETE = 'incomplete',
  COMPLETED = 'completed',
  MISSING = 'missing'
}

export interface LanguageInfo {
  translator: string;
  contributors: Array<string>;
  completion: LanguageStatus;
  aliases?: Array<string>;
  code: string;
  flag: string;
  friendly: string;
  strings: {
    [x: string]: string|Record<string, unknown>;
  };
}

export class Translation {
  constructor(public key: string, public args?: { [x: string]: any }|undefined) {}
}

export interface DMOptions {
  user: User;
  content?: string;
  embed?: EmbedOptions;
}

export enum CommandCategory {
  GENERAL = 'General',
  SUGGESTIONS = 'Suggestions',
  STAFF = 'Staff',
  ADMIN = 'Admin',
  OWNER = 'Owner'
}

export interface StatusEvent {
  status:  'online'|'idle'|'dnd'|'offline'|undefined;
  name: string;
  type: BotActivityType;
  url: string|undefined;
}
