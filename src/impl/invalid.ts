export default class Invalid {
  reason: string;
  explanation?: string | null;

  constructor(reason: string, explanation?: string | null) {
    this.reason = reason;
    this.explanation = explanation;
  }

  toMessage() {
    if (this.explanation) {
      return `${this.reason}: ${this.explanation}`;
    } else {
      return this.reason;
    }
  }
}
