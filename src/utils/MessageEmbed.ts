import { EmbedAuthor, EmbedField, EmbedFooter, EmbedImage } from 'eris';

import { EmbedThumbnail } from '../types';

export default class MessageEmbed {
  readonly #HEX_REGEX: RegExp = /^#?([a-fA-F0-9]{6})$/;
  readonly #URL_REGEX: RegExp = /^http(s)?:\/\/[\w.-]+(?:\.[\w.-]+)+[\w\-._~:/?#[\]@!$&'()*+,;=.]+$/;
  title?: string;
  description?: string;
  url?: string;
  timestamp?: Date|string;
  color?: number;
  footer?: EmbedFooter;
  image?: EmbedImage;
  thumbnail?: EmbedThumbnail;
  author?: EmbedAuthor;
  fields: Array<EmbedField>;

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

  setTitle(title: string): this {
    if (title.length > 256) throw new RangeError('Embed titles cannot exceed 356 characters');
    this.title = title;
    return this;
  }

  setDescription(description: string): this {
    if (description.length > 2048) throw new RangeError('Embed titles cannot exceed 2048 characters');
    this.description = description;
    return this;
  }

  setURL(url: string): this {
    if (!this.#URL_REGEX.test(url)) throw new Error('Not a well formed URL');
    this.url = url;
    return this;
  }

  setTimestamp(timestamp = new Date()): this {
    if (Number.isNaN(new Date(timestamp).getTime())) throw new Error('Invalid Date');
    this.timestamp = new Date(timestamp);
    return this;
  }

  setColor(color: string|number): this {
    if (typeof color === 'number') {
      if (color > 16777215 || color < 0) throw new RangeError('Invalid color');
      this.color = color;
    } else {
      const match = color.match(this.#HEX_REGEX);
      if (!match) throw new Error('Invalid color');
      this.color = parseInt(match[1], 16);
    }

    return this;
  }

  setFooter(text: string, iconURL?: string): this {
    if (text.length > 2048) throw new RangeError('Embed footer texts cannot exceed 2048 characters');
    this.footer = { text };

    if (iconURL !== undefined) {
      if (!iconURL.startsWith('attachment://') && !this.#URL_REGEX.test(iconURL)) throw new Error('Not a well formed URL');
      this.footer.icon_url = iconURL;
    }

    return this;
  }

  setImage(imageURL: string): this {
    if (!imageURL.startsWith('attachment://') && !this.#URL_REGEX.test(imageURL)) throw new Error('Not a well formed URL');
    this.image = { url: imageURL };
    return this;
  }

  setThumbnail(thumbnailURL: string): this {
    if (!thumbnailURL.startsWith('attachment://') && !this.#URL_REGEX.test(thumbnailURL)) throw new Error('Not a well formed URL');
    this.thumbnail = { url: thumbnailURL };
    return this;
  }

  setAuthor(name: string, iconURL?: string|null, url?: string): this {
    if (name.length > 256) throw new RangeError('Embed footer texts cannot exceed 2048 characters');
    this.author = { name };

    if (iconURL) {
      if (!iconURL.startsWith('attachment://') && !this.#URL_REGEX.test(iconURL)) throw new Error('Not a well formed URL');
      this.author.icon_url = iconURL;
    }

    if (url) {
      if (!this.#URL_REGEX.test(url)) throw new Error('Not a well formed URL');
      this.author.url = url;
    }


    return this;
  }

  addField(name: string, value: string, inline = false): this {
    if (this.fields.length >= 25) throw new RangeError('Embeds cannot contain more than 25 fields');
    if (name.length > 256) throw new RangeError('Embed field names cannot exceed 256 characters');
    if (value.length > 1024) throw new RangeError('Embed field names cannot exceed 256 characters');

    this.fields.push({ name, value, inline });
    return this;
  }

  addFields(...fields: Array<EmbedField>): this {
    this.fields.push(...MessageEmbed.normalizeFields(...fields));
    return this;
  }

  static normalizeField(name: string, value: string, inline: boolean = false): EmbedField {
    return { name, value, inline };
  }

  static normalizeFields(...fields: Array<EmbedField>): Array<EmbedField> {
    return fields
      .flat(2)
      .map(field =>
        this.normalizeField(
          field && field.name,
          field && field.value,
          field?.inline ?? false,
        ),
      );
  }
}
