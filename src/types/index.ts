import { BotActivityType, Guild, Member, Message, User } from 'eris';
import { Commands, RedisClient } from 'redis';
import { Document } from 'mongoose';
import { StoreData } from 'frenchkiss';
import { Collection } from '@augu/immutable';

import SuggestionsClient from '../structures/core/Client';
import Context from '../structures/commands/Context';
import Ratelimit from '../structures/core/Ratelimit';

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
  superSecretUsers: Array<string>;
  permissions: {
    regular: number;
    logs: number;
    staff: number;
    actionlogs: number;
  };
  defaults: {
    guild: GuildSchema,
    user: UserSchema
  };
  supportRoles: Array<string>
  boosterRole: string
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
  public conditions?: Array<string>;
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
  public supportOnly?: boolean;
  public botPermissions?: Array<string|number>;
  public userPermissions?: Array<string|number>;
  public throttles!: CommandThrottling;
  public ratelimiter?: Collection<Ratelimit>;
  protected constructor(public client: SuggestionsClient) {}
  public abstract run(ctx: Context): Promise<any>;
  public abstract runPreconditions?(ctx: Context, next: CommandNextFunction): any;
  public abstract runPostconditions?(ctx: Context, next: CommandNextFunction): any;
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

export type CommandNextData<T> = T;
export type CommandNextFunction = <CommandNextData>(data?: CommandNextData) => void;

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
  premium: boolean;
  premiumSince: string;
  channels: Array<SuggestionChannel>;
  staffRoles: Array<SuggestionRole>;
  defaultEmojis: number;
  emojis: Array<VoteEmoji>;
  responseRequired: boolean;
  dmResponses: boolean;
  disabledCommands: Array<DisabledCommand>;
  selfVoting: boolean;
  uniqueVoting: boolean;
  restrictVoting: boolean;
  requiredResponses: Array<RequiredResponseCommand>;
  userSelfDelete: boolean;
  staffDelete: boolean;
  userSelfEdit: boolean;
  staffEdit: boolean;
  allowNicknames: boolean;
  setGuild(guild: Guild|string): void;
  setLocale(locale: string): void;
  setDefaultEmojis(index: number): void
  setSelfVoting(status: boolean): void;
  setUniqueVoting(status: boolean): void;
  setRestrictVoting(status: boolean): void;
  setSelfDelete(status: boolean): void;
  setStaffDelete(status: boolean): void;
  setSelfEdit(status: boolean): void;
  setStaffEdit(status: boolean): void;
  setAllowNicknames(status: boolean): void;
  updatePrefixes(prefix: string): void;
  updateEmojis(emoji: VoteEmoji): void;
  updateChannel(channel: string, data: Record<string, unknown>): void;
  updateChannels(channel: SuggestionChannel): void;
  updateCommands(command: DisabledCommand): void;
  updateStaffRoles(role: SuggestionRole): void;
  updateChannelRoles(channel: string, role: SuggestionRole): void;
  updateRequiredResponses(command: RequiredResponseCommand, status: boolean): void
}

export interface SuggestionChannel extends Document {
  id: string;
  type: SuggestionChannelType;
  allowed: Array<SuggestionRole>;
  blocked: Array<SuggestionRole>;
  emojis: number;
  cooldown: number;
  locked: boolean;
  reviewMode: boolean;
  added: number;
  addedBy: string;
}

export interface SuggestionRole extends Document {
  id: string;
  type: 'allowed'|'blocked'|'staff';
  added: number;
  addedBy: string;
}

export enum SuggestionChannelType {
  SUGGESTIONS = 'suggestions',
  LOGS = 'logs',
  STAFF = 'staff',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  ACTION_LOGS = 'actionlogs'
}

export interface DisabledCommand extends Document {
  command: string;
  added: number;
  addedBy: string;
}

export interface VoteEmoji extends Document {
  index: number;
  system: boolean;
  custom: boolean;
  emojis: VoteEmojiArray;
  added: number;
  addedBy: string;
}

export type VoteEmojiArray = [string, string, string?];

export type RequiredResponseCommand = |
'approve' |
'reject' |
'consider' |
'implement' |
'delete' |
'edit' |
'all' |
'none';

export interface ActionLogSchema extends Document {
  guild: string;
  channel: string;
  executor: string;
  target?: string;
  id: string;
  time: number;
  type: ActionLogTypes;
  changes: Array<ActionLogChange>;
}

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
  reason: string;
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

export interface UserSchema extends Document {
  id: string;
  locale: Locales;
  premium?: boolean;
  premiumSince?: number;
  showNickname: boolean;
  setLocale(locale: Locales): void;
  setPremium(status: boolean, timestamp?: number): void;
  setShowNickname(status: boolean): void;
}

export type Locales = |
'en_US' |
'fr_FR';

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
  strings: { [x: string]: StoreData; };
}

export class Translation {
  constructor(public key: string, public args?: { [x: string]: any }|undefined) {}
}

export enum CommandCategory {
  GENERAL = 'General',
  SUGGESTIONS = 'Suggestions',
  STAFF = 'Staff',
  ADMIN = 'Admin',
  SECRET = 'Secret',
  SUPPORT = 'Support',
  OWNER = 'Owner'
}

export interface StatusEvent {
  status:  'online'|'idle'|'dnd'|'offline'|undefined;
  name: string;
  type: BotActivityType;
  url: string|undefined;
}

export interface InternalVoteEmoji {
  id: number;
  name: string;
  emojis: Array<string>;
  custom: boolean;
  added?: number
  addedBy?: string;
}

export type ActionLogTypes = |
'BLACKLIST_ADDED' |
'BLACKIST_DELETED' |
'CHANNEL_ADDED' |
'CHANNEL_DELETED' |
'SUGGESTION_APPROVED' |
'SUGGESTION_COMMENT_ADDED' |
'SUGGESTION_COMMENT_DELETED' |
'SUGGESTION_CREATED' |
'SUGGESTION_DELETED' |
'SUGGESTION_EDITED' |
'SUGGESTION_NOTE_ADDED' |
'SUGGESTION_NOTE_DELETED' |
'SUGGESTION_REJECTED';

export type ActionLogChange = {
  key: string;
  before: any;
  after: any;
};
