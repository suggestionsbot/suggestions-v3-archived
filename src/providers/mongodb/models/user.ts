import { Schema, model, HookNextFunction } from 'mongoose';
import { Locales, UserSchema } from '../../../types';

export const UserSettings = new Schema({
  user: {
    type: String,
    unique: true,
    index: true
  },
  locale: {
    type: String,
    enum: ['en_US', 'fr_FR'],
    default: 'en_US'
  },
  premium: { type: Boolean },
  premiumSince: { type: Number },
  showNickname: { type: Boolean, default: false }
});

UserSettings.method('setLocale', function(this: UserSchema, locale: Locales) {
  this.locale = locale;
});

UserSettings.method('setPremium', function(this: UserSchema, status: boolean ,timestamp?: number) {
  if (status) {
    this.premium = status;
    this.premiumSince = timestamp!;
  } else {
    this.premium = status;
    this.premiumSince = undefined;
  }
});

UserSettings.method('setShowNickname', function(this: UserSchema, status: boolean) {
  this.showNickname = status;
});

UserSettings.pre('save', function(next: HookNextFunction) {
  this.increment();
  next();
});

export default model<UserSchema>('Users', UserSettings, 'users');
