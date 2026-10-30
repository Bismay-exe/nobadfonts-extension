export class NoBadFontsRequestError extends Error {
  constructor() {
    super('The NoBadFonts catalog could not be loaded.');
    this.name = 'NoBadFontsRequestError';
  }
}
