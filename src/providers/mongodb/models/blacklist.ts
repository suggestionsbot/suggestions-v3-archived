import { Schema, model } from 'mongoose';
import { BlacklistSchema } from '../../../types';

export const Blacklist = new Schema({
  guild: { type: String },
  user: { type: String },
  reason: { type: String },
  issuer: { type: String, alias: 'issuerID' },
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

export default model<BlacklistSchema>('Blacklist', Blacklist, 'blacklists');
