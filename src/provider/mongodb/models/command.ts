import { Schema, model } from 'mongoose';
import { CommandSchema } from '../../../types';

export const Command = new Schema({
  guild: { type: String },
  channel: { type: String },
  message: { type: String },
  command: { type: String },
  user: { type: String },
  time: { type: Number, default: Date.now() }
});

Command.pre('save', function(next) {
  this.increment();
  next();
});

export default model<CommandSchema>('Commands', Command, 'commands');
