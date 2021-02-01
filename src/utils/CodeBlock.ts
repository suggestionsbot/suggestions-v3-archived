export default class CodeBlock {
  content: string;
  lang: string;

  constructor(content?: string, lang?: string) {
    this.content = content || '';
    this.lang = lang || '';
  }

  setContent(content: string): this {
    this.content = content;
    return this;
  }

  setLang(lang: string): this {
    this.lang = lang;
    return this;
  }

  toString(): string {
    return `\`\`\`${this.lang}\n${this.content}\`\`\``;
  }
}
