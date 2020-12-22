import { model, Schema } from 'mongoose';
import { ModLogSchema } from '../../../types';

export const ModLog = new Schema({
  guild: { type: String },
  user: { type: String },
  moderator: { type: String },
  channel: { type: String },
  id: { type: String },
  time: { type: Number, default: Date.now() },
  type: { type: String, enum: [''] }
});

export default model<ModLogSchema>('ModLog', ModLog, 'modlogs');
