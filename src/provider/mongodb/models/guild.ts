import { Schema, model } from 'mongoose';
import { DisabledCommand, GuildSchema, SuggestionChannel, SuggestionRole } from '../../../types';
import { Guild } from 'eris';

const SuggestionRole = {
  role: { type: String },
  type: { type: String, enum: ['allowed', 'blocked'] },
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
  channels: {
    type: [{
      channel: String,
      type: {
        type: String,
        enum: ['suggestions', 'logs', 'approved', 'rejected', 'staff']
      },
      allowed: { type: [SuggestionRole] },
      blocked: { type: [SuggestionRole] },
      emoji: { type: String },
      locked: { type: Boolean, default: false },
      reviewMode: { type: Boolean, default: false },
      added: { type: Number, default: Date.now() },
      addedBy: String
    }]
  },
  staffRoles: [String],
  emojis: {
    name: String,
    default: { type: Boolean },
    emojis: [String],
    added: { type: Number, default: Date.now() },
    addedBy: String
  },
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

GuildSettings.method('updatePrefixes', function(this: GuildSchema, prefix: string) {
  if (this.prefixes.includes(prefix)) {
    this.prefixes = this.prefixes.filter(p => p !== prefix);
  } else {
    this.prefixes = [...this.prefixes, prefix];
  }
});

GuildSettings.method('updateChannels', function(this: GuildSchema, channel: SuggestionChannel) {
  const channelInArray = this.channels.find((c: SuggestionChannel) => c.channel === channel.channel)!;
  if (channelInArray) {
    this.channels = this.channels.filter((c: SuggestionChannel) => c !== channelInArray);
  } else {
    this.channels = [...this.channels, channel];
  }
});

GuildSettings.method('updateChannel', function(this: GuildSchema, channel: string, data: Record<string, unknown>) {
  this.channels = this.channels.map(chn => {
    if (chn.channel !== channel) return chn;
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

GuildSettings.method('updateStaffRoles', function(this: GuildSchema, role: string) {
  const roleInArray = this.staffRoles.includes(role);
  if (roleInArray) {
    this.staffRoles = this.staffRoles.filter(r => r !== role);
  } else {
    this.staffRoles = [...this.staffRoles, role];
  }
});

GuildSettings.method('updateChannelRoles', function(this: GuildSchema, channel: string, role: SuggestionRole) {
  const channelInArray = this.channels.find(c => c.channel === channel)!;
  switch (role.type) {
    case 'allowed': {
      const roleInArray = channelInArray.allowed.find(r => r.role === role.role);
      if (roleInArray) {
        channelInArray.allowed = channelInArray.allowed.filter(r => r.role !== role.role);
      } else {
        channelInArray.allowed = [...channelInArray.allowed, role];
      }

      break;
    }
    case 'blocked': {
      const roleInArray = channelInArray.blocked.find(r => r.role === role.role);
      if (roleInArray) {
        channelInArray.blocked = channelInArray.blocked.filter(r => r.role !== role.role);
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
