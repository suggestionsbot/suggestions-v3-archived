import { Schema, model, HookNextFunction } from 'mongoose';
import { Locales, UserGuildProfile, UserGuildProfileKey, UserSchema } from '../../../types';

export const UserSettings = new Schema({
  user: {
    type: String,
    unique: true,
    index: true
  },
  locale: {
    type: String,
    enum: ['en_US', 'fr_FR', 'pt_BR']
  },
  premium: { type: Boolean },
  premiumSince: { type: Number },
  showNickname: { type: Boolean },
  guilds: [{
    id: { type: String },
    locale: {
      type: String,
      enum: ['en_US', 'fr_FR', 'pt_BR']
    },
    showNickname: { type: Boolean }
  }]
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

UserSettings.method('updateGuildProfiles', function(this: UserSchema, profile: UserGuildProfile) {
  const profileInArray = this.guilds.find(p => p.id === profile.id);
  if (profileInArray) {
    this.guilds = this.guilds.filter(p => p !== profile);
  } else {
    this.guilds = [...this.guilds, profile];
  }
});

UserSettings.method('updateGuildProfile', function(this: UserSchema, guild: UserGuildProfileKey, data: UserGuildProfile) {
  this.guilds = this.guilds.map(profile => {
    if (profile.id !== guild) return profile;
    return <UserGuildProfile>{ ...profile.toObject(), ...data };
  });
});

UserSettings.pre('save', function(next: HookNextFunction) {
  this.increment();
  next();
});

export default model<UserSchema>('Users', UserSettings, 'users');
