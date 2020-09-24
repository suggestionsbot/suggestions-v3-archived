import { Schema, model } from 'mongoose';
import { GuildSchema } from '../../../types';

export const GuildSettings = new Schema({
  guildID: {
    type: String,
    unique: true,
    index: true
  },
  prefix: {
    type: String,
    default: ','
  },
  suggestionsChannel: {
    type: String,
    default: 'suggestions'
  },
  locale: {
    type: String,
    default: 'en_US'
  },
  channels: {
    type: [{
      channel: String,
      type: {
        type: String,
        enum: ['suggestions', 'logs', 'approved', 'rejected', 'staff'],
        default: 'suggestions'
      },
      added: {
        type: Number,
        default: Date.now()
      },
      addedBy: String
    }]
  },
  voteEmojis: { type: String },
  responseRequired: {
    type: Boolean,
    default: false
  },
  dmResponses: {
    type: Boolean,
    default: true
  },
  disabledCommand: [{
    command: String,
    added: { type: Number, default: Date.now() },
    addedBy: String
  }]
});

GuildSettings.pre('save', function(next) {
  this.increment();
  next();
});

export default model<GuildSchema>('Settings', GuildSettings);
