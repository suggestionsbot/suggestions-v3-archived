import { Schema, model } from 'mongoose';
import { DisabledCommand, GuildSchema, SuggestionChannel, SuggestionRole, VoteEmoji } from '../../../types';
import { Guild } from 'eris';

const SuggestionRole = {
  id: { type: String },
  type: { type: String, enum: ['allowed', 'blocked', 'staff'] },
  added: { type: Number, default: Date.now() },
  addedBy: { type: String }
};

export const GuildSettings = new Schema({
  guild: {
    type: String,
    unique: true,
    index: true
  },
  prefixes: { type: [String], default: [','] },
  locale: { type: String, default: 'en_US' },
  premium: { type: Boolean },
  premiumSince: { type: String },
  channels: {
    type: [{
      id: String,
      type: {
        type: String,
        enum: ['suggestions', 'logs', 'approved', 'rejected', 'staff', 'modlogs']
      },
      allowed: { type: [SuggestionRole] },
      blocked: { type: [SuggestionRole] },
      emojis: { type: Number },
      cooldown: { type: Number },
      locked: { type: Boolean, default: false },
      reviewMode: { type: Boolean, default: false },
      added: { type: Number, default: Date.now() },
      addedBy: String
    }]
  },
  staffRoles: [SuggestionRole],
  defaultEmojis: { type: Number, default: 0 },
  emojis: [{
    id: Number,
    name: String,
    custom: { type: Boolean, default: true },
    emojis: [String],
    added: { type: Number, default: Date.now() },
    addedBy: String
  }],
  responseRequired: {
    type: Boolean,
    default: false
  },
  dmResponses: {
    type: Boolean,
    default: true
  },
  disabledCommands: [{
    command: String,
    added: { type: Number, default: Date.now() },
    addedBy: String
  }]
});

GuildSettings.method('setGuild', function(this: GuildSchema, guild: Guild|string) {
  this.locale = guild instanceof Guild ? guild.id : guild;
});

GuildSettings.method('setLocale', function(this: GuildSchema, locale: string) {
  this.locale = locale;
});

GuildSettings.method('setDefaultEmojis', function(this: GuildSchema, index: number) {
  this.defaultEmojis = index;
});

GuildSettings.method('updatePrefixes', function(this: GuildSchema, prefix: string) {
  if (this.prefixes.includes(prefix)) {
    this.prefixes = this.prefixes.filter(p => p !== prefix);
  } else {
    this.prefixes = [...this.prefixes, prefix];
  }
});

GuildSettings.method('updateEmojis', function(this: GuildSchema, emoji: VoteEmoji) {
  const emojiInArray = this.emojis.find((c: VoteEmoji) => c.id === emoji.id)!;
  if (emojiInArray) {
    this.emojis = this.emojis.filter((c: VoteEmoji) => c !== emojiInArray);
  } else {
    this.emojis = [...this.emojis, emoji];
  }
});

GuildSettings.method('updateChannels', function(this: GuildSchema, channel: SuggestionChannel) {
  const channelInArray = this.channels.find((c: SuggestionChannel) => c.id === channel.id)!;
  if (channelInArray) {
    this.channels = this.channels.filter((c: SuggestionChannel) => c !== channelInArray);
  } else {
    this.channels = [...this.channels, channel];
  }
});

GuildSettings.method('updateChannel', function(this: GuildSchema, channel: string, data: Record<string, unknown>) {
  this.channels = this.channels.map(chn => {
    if (chn.id !== channel) return chn;
    return <SuggestionChannel>{ ...chn.toObject(), ...data };
  });
});

GuildSettings.method('updateCommands', function(this: GuildSchema, { command }: DisabledCommand) {
  const commandInArray = this.disabledCommands.find((c: DisabledCommand) => c.command === command)!;
  if (commandInArray) {
    this.disabledCommands = this.disabledCommands.filter((c: DisabledCommand) => c !== commandInArray);
  } else {
    this.disabledCommands = [...this.disabledCommands, commandInArray];
  }
});

GuildSettings.method('updateStaffRoles', function(this: GuildSchema, role: SuggestionRole) {
  const roleInArray = this.staffRoles.find(r => r.id === role.id);
  if (roleInArray) {
    this.staffRoles = this.staffRoles.filter(r => r !== role);
  } else {
    this.staffRoles = [...this.staffRoles, role];
  }
});

GuildSettings.method('updateChannelRoles', function(this: GuildSchema, channel: string, role: SuggestionRole) {
  const channelInArray = this.channels.find(c => c.id === channel)!;
  switch (role.type) {
    case 'allowed': {
      const roleInArray = channelInArray.allowed.find(r => r.id === role.id);
      if (roleInArray) {
        channelInArray.allowed = channelInArray.allowed.filter(r => r.id !== role.id);
      } else {
        channelInArray.allowed = [...channelInArray.allowed, role];
      }

      break;
    }
    case 'blocked': {
      const roleInArray = channelInArray.blocked.find(r => r.id === role.id);
      if (roleInArray) {
        channelInArray.blocked = channelInArray.blocked.filter(r => r.id !== role.id);
      } else {
        channelInArray.blocked = [...channelInArray.blocked, role];
      }

      break;
    }
  }
});

GuildSettings.pre('save', function(next) {
  this.increment();
  next();
});

export default model<GuildSchema>('Settings', GuildSettings, 'settings');
