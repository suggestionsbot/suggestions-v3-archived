import { Schema, model } from 'mongoose';
import { DisabledCommand, GuildSchema, SuggestionChannel } from '../../../types';
import { Guild } from 'eris';

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
      added: { type: Number, default: Date.now() },
      addedBy: String
    }]
  },
  staffRoles: [String],
  voteEmojis: { type: String },
  emojis: {
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

GuildSettings.method('setEmojis', function(this: GuildSchema, id: string) {
  this.voteEmojis = id;
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

GuildSettings.method('updateChannels', function(this: GuildSchema, { channel }: SuggestionChannel) {
  const channelInArray = this.channels.find((c: SuggestionChannel) => c.channel === channel)!;
  if (channelInArray) {
    this.channels = this.channels.filter((c: SuggestionChannel) => c !== channelInArray);
  } else {
    this.channels = [...this.channels, channelInArray];
  }
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
    this.staffRoles = this.staffRoles.filter((r: string) => r !== role);
  } else {
    this.staffRoles = [...this.staffRoles, role];
  }
});

GuildSettings.pre('save', function(next) {
  this.increment();
  next();
});

export default model<GuildSchema>('Settings', GuildSettings, 'settings');
