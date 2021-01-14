import { model, Schema } from 'mongoose';
import { ActionLogSchema } from '../../../types';

export const Actionlog = new Schema({
  guild: { type: String },
  executor: { type: String },
  target: { type: String },
  channel: { type: String },
  id: { type: String },
  time: { type: Number, default: Date.now() },
  type: { type: String, enum: [
    'BLACKLIST_ADDED',
    'BLACKLIST_DELETED',
    'CHANNEL_ADDED',
    'CHANNEL_DELETED',
    'SUGGESTION_APPROVED',
    'SUGGESTION_COMMENT_ADDED',
    'SUGGESTION_COMMENT_DELETED',
    'SUGGESTION_CREATED',
    'SUGGESTION_DELETED',
    'SUGGESTION_EDITED',
    'SUGGESTION_NOTE_ADDED',
    'SUGGESTION_NOTE_DELETED',
    'SUGGESTION_REJECTED'
  ] }
});

export default model<ActionLogSchema>('ActionLog', Actionlog, 'actionlogs');
