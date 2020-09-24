import { Message, User } from 'eris';
import SuggestionsClient from '../structures/client';
import { Document } from 'mongoose';
import { Commands, RedisClient } from 'redis';

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
}

export interface VoteSite {
  name: string;
  link: string;
  voted: boolean;
}

export interface Command {
  name: string;
  description: string;
  category: string;
  subCommands: Array<string>;
  usage: Array<string>;
  examples: Array<string>;
  aliases: Array<string>;
  active: boolean;
  guarded: boolean;
  guildOnly: boolean;
  staffOnly: boolean;
  adminOnly: boolean;
  ownerOnly: boolean;
  superOnly: boolean;
  botPermissions: Array<string|number>;
  userPermissions: Array<string|number>;
  throttles: Map<string, CommandThrottle>;
  throttling: CommandThrottling;
  run(message: Message, args: Array<string>, settings?: GuildSchema): Promise<void>;
  runPreconditions(message: Message, args: Array<string>, next: CommandNextFunction, settings?: GuildSchema): Promise<void>;
  runPostconditions(message: Message, args: Array<string>, next: CommandNextFunction, settings?: GuildSchema): Promise<void>;
  throttle(user: User): CommandThrottle;
}

export interface SubCommand extends Command {
  parent: string;
  arg: string;
  friendly: string;
}

export interface CommandThrottle {
  start: number;
  usages: number;
  timeout: NodeJS.Timeout;
}

export interface CommandThrottling {
  usages: number;
  duration: number;
}

export type CommandNextFunction = () => void;

export interface Event {
  client?: SuggestionsClient;
  name?: string;
  options?: EventOptions;
  type: string;
  emitter: SuggestionsClient|string;
  run(...args: Array<any>): Promise<any>;
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
  guildID: string,
  prefix: string;
  channels: Array<SuggestionChannel>;
  staffRoles: Array<string>;
  voteEmojis: string;
  responseRequired: boolean;
  dmResponses: boolean;
  disabledCommand: Array<DisabledCommand>;
}

export interface SuggestionChannel extends Document {
  channel: string;
  type: SuggestionChannelType;
  added: number;
  addedBy: string;
}

export enum SuggestionChannelType {
  'suggestions' = 'suggestions',
  'logs' = 'logs',
  'staff' = 'staff',
  'approved' = 'approved',
  'rejected' = 'rejected'
}

export interface DisabledCommand extends Document {
  command: string;
  added: number;
  addedBy: string;
}

export interface SuggestionSchema extends Document {
  guild: string;
  channel: string;
  message: string;
  user: string;
  suggestion: string;
  id: string;
  time: number;
  results: ResultEmoji;
  statusUpdates: Array<StatusUpdates>;
  voted: Array<VoteResult>;
  notes: Array<Note>;
  edits: Array<Edit>;
  getMessageLink(args: MessageLinkFormatter): string;
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

export interface BlacklistSchema extends Document {
  guild: string;
  user: string;
  reason: string;
  issuedBy: string;
  time: number;
  status: boolean;
  case: number;
  scope: BlacklistScope;
}

export enum BlacklistScope {
  'guild' = 'guild',
  'global' = 'global'
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
