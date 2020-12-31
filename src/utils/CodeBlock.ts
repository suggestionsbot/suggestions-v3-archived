export default class CodeBlock {
  public content: string;
  public lang: string;

  constructor(content: string, lang: string) {
    this.content = content || '';
    this.lang = lang || '';
  }

  public setContent(content: string): this {
    this.content = content;
    return this;
  }

  public setLang(lang: string): this {
    this.lang = lang;
    return this;
  }

  public toString(): string {
    return `\`\`\`${this.lang}\n${this.content}\`\`\``;
  }
}
