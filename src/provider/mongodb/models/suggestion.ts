import { Schema, model } from 'mongoose';
import { SuggestionSchema, MessageLinkFormatter } from '../../../types';

export const Suggestion = new Schema({
  guild: { type: String },
  user: { type: String },
  channel: { type: String },
  message: { type: String },
  suggestion: { type: String },
  id: { type: String },
  time: { type: Number, default: Date.now() },
  statusUpdates: {
    type: [{
      status: { type: String },
      response: { type: String },
      time: { type: String, default: Date.now() },
      updatedBy: { type: String }
    }]
  },
  results: { type: [{ emoji: String, count: Number, time: { type: Number, default: Date.now() } }]},
  voted: { type: [{ userID: String, vote: Number, time: { type: Number, default: Date.now() } }]},
  notes: {
    type: [{
      note: String,
      addedBy: String,
      added: { type: Number, default: Date.now() }
    }]
  },
  edits: {
    type: [{
      edit: String,
      editedBy: String,
      edited: { type: Number, default: Date.now() }
    }]
  }
});

Suggestion.method('getMessageLink', function(args: MessageLinkFormatter): string {
  return `https://discord.com/channels/${args[0]}/${args[1]}/${args[2]}`;
});

Suggestion.pre('save', function(next) {
  this.increment();
  next();
});

export default model<SuggestionSchema>('Suggestion', Suggestion);
