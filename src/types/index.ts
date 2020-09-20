import { ClientOptions, Message, Permission, User } from 'eris';
import SuggestionsClient from '../structures/client';
import Collection from '@discordjs/collection';
import * as EventClass from '../structures/event';

declare module 'eris' {
  interface ExtendedTextChannel {
    awaitMessages(filter: CollectorFilter<any>, options: AwaitMessagesOptions): boolean | Promise<boolean>;
  }
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
  run(message: Message, args: Array<string>, settings: any): Promise<void>;
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

export type CollectorFilter<T> = (...args: Array<T>) => Promise<Collection<string, T>>;

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


