export default class LanguageError extends Error {
  constructor(public name: string, message?: string) {
    super(message);
  }
}
