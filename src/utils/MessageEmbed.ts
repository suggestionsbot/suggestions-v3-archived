import { EmbedAuthor, EmbedField, EmbedFooter, EmbedImage } from 'eris';
import { EmbedThumbnail } from '../types';

export default class MessageEmbed {
  private readonly _HEX_REGEX: RegExp = /^#?([a-fA-F0-9]{6})$/;
  private readonly _URL_REGEX: RegExp = /^http(s)?:\/\/[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/;
  public title?: string;
  public description?: string;
  public url?: string;
  public timestamp?: Date|string;
  public color?: number;
  public footer?: EmbedFooter;
  public image?: EmbedImage;
  public thumbnail?: EmbedThumbnail;
  public author?: EmbedAuthor;
  public fields: Array<EmbedField>;

  constructor(public data: any = {}) {
    if (data.title) this.title = data.title;
    if (data.description) this.description = data.description;
    if (data.url) this.url = data.url;
    if (data.timestamp) this.timestamp = data.timestamp;
    if (data.color) this.color = data.color;
    if (data.footer) this.footer = data.footer;
    if (data.image) this.image = data.image;
    if (data.thumbnail) this.thumbnail = data.thumbnail;
    if (data.author) this.author = data.author;
    this.fields = data.fields || [];
  }

  public setTitle(title: string): this {
    if (typeof title !== 'string') throw new TypeError(`Expected type 'string', received type '${typeof title}'`);
    if (title.length > 256) throw new RangeError('Embed titles cannot exceed 356 characters');
    this.title = title;
    return this;
  }

  public setDescription(description: string): this {
    if (typeof description !== 'string') throw new TypeError(`Expected type 'string', received type '${typeof description}'`);
    if (description.length > 2048) throw new RangeError('Embed titles cannot exceed 2048 characters');
    this.description = description;
    return this;
  }

  public setURL(url: string): this {
    if (typeof url !== 'string') throw new TypeError(`Expected type 'string', received type '${typeof url}'`);
    if (!this._URL_REGEX.test(url)) throw new Error('Not a well formed URL');
    this.url = url;
    return this;
  }

  public setTimestamp(timestamp = new Date()): this {
    if (Number.isNaN(new Date(timestamp).getTime())) throw new Error('Invalid Date');
    this.timestamp = new Date(timestamp);
    return this;
  }

  public setColor(color: string|number): this {
    if (typeof color !== 'string' && typeof color !== 'number') throw new TypeError(`Expected types 'string' or 'number', received type ${typeof color} instead`);
    if (typeof color === 'number') {
      if (color > 16777215 || color < 0) throw new RangeError('Invalid color');
      this.color = color;
    } else {
      const match = color.match(this._HEX_REGEX);
      if (!match) throw new Error('Invalid color');
      this.color = parseInt(match[1], 16);
    }

    return this;
  }

  public setFooter(text: string, iconURL?: string): this {
    if (typeof text !== 'string') throw new TypeError(`Expected type 'string', received type ${typeof text}`);
    if (text.length > 2048) throw new RangeError('Embed footer texts cannot exceed 2048 characters');
    this.footer = { text };

    if (iconURL !== undefined) {
      if (typeof iconURL !== 'string') throw new TypeError(`Expected type 'string', received type '${typeof iconURL}'`);
      if (!iconURL.startsWith('attachment://') && !this._URL_REGEX.test(iconURL)) throw new Error('Not a well formed URL');
      this.footer.icon_url = iconURL;
    }

    return this;
  }

  public setImage(imageURL: string): this {
    if (typeof imageURL !== 'string') throw new TypeError(`Expected type 'string', received type ${typeof imageURL}`);
    if (!imageURL.startsWith('attachment://') && !this._URL_REGEX.test(imageURL)) throw new Error('Not a well formed URL');
    this.image = { url: imageURL };
    return this;
  }

  public setThumbnail(thumbnailURL: string): this {
    if (typeof thumbnailURL !== 'string') throw new TypeError(`Expected type 'string', received type ${typeof thumbnailURL}`);
    if (!thumbnailURL.startsWith('attachment://') && !this._URL_REGEX.test(thumbnailURL)) throw new Error('Not a well formed URL');
    this.thumbnail = { url: thumbnailURL };
    return this;
  }

  public setAuthor(name: string, iconURL?: string, url?: string): this {
    if (typeof name !== 'string') throw new TypeError(`Expected type 'string', received type ${typeof name}`);
    if (name.length > 256) throw new RangeError('Embed footer texts cannot exceed 2048 characters');
    this.author = { name };

    if (iconURL !== undefined) {
      if (typeof iconURL !== 'string') throw new TypeError(`Expected type 'string', received type '${typeof iconURL}'`);
      if (!iconURL.startsWith('attachment://') && !this._URL_REGEX.test(iconURL)) throw new Error('Not a well formed URL');
      this.author.icon_url = iconURL;
    }

    if (url !== undefined) {
      if (typeof url !== 'string') throw new TypeError(`Expected type 'string', received type '${typeof url}'`);
      if (!this._URL_REGEX.test(url)) throw new Error('Not a well formed URL');
      this.author.url = url;
    }


    return this;
  }

  public addField(name: string, value: string, inline = false): this {
    if (this.fields.length >= 25) throw new RangeError('Embeds cannot contain more than 25 fields');
    if (typeof name !== 'string') throw new TypeError(`Expected type 'string', received type ${typeof name}`);
    if (typeof value !== 'string') throw new TypeError(`Expected type 'string', received type ${typeof value}`);
    if (typeof inline !== 'boolean') throw new TypeError(`Expected type 'boolean', received type ${typeof inline}`);
    if (name.length > 256) throw new RangeError('Embed field names cannot exceed 256 characters');
    if (value.length > 1024) throw new RangeError('Embed field names cannot exceed 256 characters');

    this.fields.push({ name, value, inline });
    return this;
  }
}
