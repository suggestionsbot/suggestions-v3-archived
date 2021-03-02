import { Schema, model } from 'mongoose';
import { SuggestionSchema, MessageLinkFormatter, SuggestionStateType } from '../../../types';

export const Suggestion = new Schema({
  guild: { type: String },
  user: { type: String },
  channel: { type: String },
  message: { type: String },
  suggestion: { type: String },
  id: { type: String },
  time: { type: Number, default: Date.now() },
  type: { type: String, enum: ['regular', 'staff'] },
  statusUpdates: {
    type: [{
      index: Number,
      state: {
        type: String,
        enum: ['PENDING', 'APPROVED', 'REJECTED', 'CONSIDERED', 'IMPLEMENTED']
      },
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
      reason: String,
      edited: { type: Number, default: Date.now() }
    }]
  },
  state: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED', 'CONSIDERED', 'IMPLEMENTED'],
    default: 'PENDING'
  },
  review: { type: Boolean }
});

Suggestion.method('getMessageLink', function(this: SuggestionSchema, args: MessageLinkFormatter): string {
  return `https://discord.com/channels/${args[0]}/${args[1]}/${args[2]}`;
});

Suggestion.method('getSuggestionID', function(this: SuggestionSchema, long = true): string {
  if (long) return this.id;
  else return this.id.slice(33, 40);
});

Suggestion.method('setState', function(this: SuggestionSchema, state: SuggestionStateType) {
  this.state = state;
});

Suggestion.method('setReview', function(this: SuggestionSchema, review: boolean) {
  this.review = review;
});

Suggestion.pre('save', function(next) {
  this.increment();
  next();
});

export default model<SuggestionSchema>('Suggestion', Suggestion, 'suggestions');
