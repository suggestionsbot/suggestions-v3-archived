import { Schema, model } from 'mongoose';
import { BlacklistSchema } from '../../types';

export const Blacklist = new Schema({
  guildID: { type: String },
  userID: { type: String },
  reason: { type: String },
  issuedBy: { type: String, alias: 'issuerID' },
  time: { type: Number, default: Date.now() },
  status: { type: Boolean },
  case: { type: Number },
  scope: {
    type: String,
    enum: ['guild', 'global'],
    default: 'guild'
  }
});

Blacklist.pre('save', function(next) {
  this.increment();
  next();
});

export default model<BlacklistSchema>('Blacklist', Blacklist);
