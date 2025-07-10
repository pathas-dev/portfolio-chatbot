class Chatbot {
  constructor() {}

  ask(message: string): string {
    return `Chatbot asks: ${message}`;
  }
}

export const chatbot = new Chatbot();
