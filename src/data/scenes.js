// Conversation scenarios. Each gives Claude a role + an instant opening line
// (the opener is static, so the chat starts immediately with no API call).
export const scenes = [
  {
    id: 'intro',
    emoji: '👋',
    title: 'Hej och hej då',
    subtitle: 'Greetings & introducing yourself',
    sceneDesc:
      'You and the learner are meeting for the first time at a language café. Greet them warmly and get to know them with very simple questions (name, how they are).',
    opener: { sv: 'Hej! Vad heter du?', en: 'Hi! What is your name?' },
  },
  {
    id: 'cafe',
    emoji: '☕',
    title: 'På café',
    subtitle: 'Ordering at a café',
    sceneDesc:
      'You are a friendly barista at a Swedish café. Greet the customer, ask what they would like, and keep it very simple.',
    opener: { sv: 'Hej och välkommen! Vad vill du ha?', en: 'Hi and welcome! What would you like?' },
  },
  {
    id: 'smalltalk',
    emoji: '🌤️',
    title: 'Lite småprat',
    subtitle: 'Everyday small talk',
    sceneDesc:
      'You are a friendly neighbour making small talk. Ask simple questions about the learner and their day. Keep vocabulary basic.',
    opener: { sv: 'Hej! Hur mår du idag?', en: 'Hi! How are you today?' },
  },
];
