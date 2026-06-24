// All teaching content lives here as data, so adding lessons later is
// just adding entries — no UI changes needed.

export const levels = [
  { id: 'A1', label: 'Beginner', unlocked: true },
  { id: 'A2', label: 'Elementary', unlocked: false },
  { id: 'B1', label: 'Intermediate', unlocked: false },
  { id: 'B2', label: 'Upper-int.', unlocked: false },
  { id: 'C1', label: 'Advanced', unlocked: false },
];

export const lessons = [
  {
    id: 'a1-1',
    level: 'A1',
    index: 1,
    title: 'Hej! — Hälsningar',
    subtitle: 'Greetings & introducing yourself',
    unlocked: true,
    grammar: {
      title: 'Swedish verbs are wonderfully simple',
      body: [
        'In the present tense a Swedish verb has ONE form for everyone — no "I am / he is" changes.',
        'So "heter" (is called) is identical for every person.',
        'A normal statement follows the order: Subject → Verb → the rest.',
      ],
      examples: [
        { sv: 'jag heter…', en: 'I am called…' },
        { sv: 'du heter…', en: 'you are called…' },
        { sv: 'han / hon heter…', en: 'he / she is called…' },
      ],
    },
    vocab: [
      { sv: 'hej', en: 'hello / hi' },
      { sv: 'god morgon', en: 'good morning' },
      { sv: 'tack', en: 'thank you' },
      { sv: 'ja', en: 'yes' },
      { sv: 'nej', en: 'no' },
      { sv: 'jag', en: 'I' },
      { sv: 'du', en: 'you' },
      { sv: 'heter', en: 'am / are / is called' },
      { sv: 'är', en: 'am / are / is' },
      { sv: 'vad', en: 'what' },
    ],
    builder: [
      {
        prompt: 'My name is Anna.',
        hint: 'Subject → Verb → name',
        answer: ['Jag', 'heter', 'Anna'],
        tip: 'Jag heter Anna — literally "I am-called Anna".',
      },
      {
        prompt: 'What is your name?',
        hint: 'Question word, then verb, then "you"',
        answer: ['Vad', 'heter', 'du'],
        tip: 'Vad heter du? — "What are-you-called?" The verb still doesn\'t change.',
      },
      {
        prompt: 'Hi, I am Erik.',
        hint: 'Greeting first, then Subject → Verb',
        answer: ['Hej', 'jag', 'är', 'Erik'],
        tip: 'Hej, jag är Erik. You could also say "jag heter Erik".',
      },
    ],
  },
  {
    id: 'a1-2',
    level: 'A1',
    index: 2,
    title: 'Varifrån? — Länder & språk',
    subtitle: 'Where are you from? Countries & languages',
    unlocked: false,
  },
  {
    id: 'a1-3',
    level: 'A1',
    index: 3,
    title: 'En eller ett? — Substantiv',
    subtitle: 'Noun genders (the en/ett game)',
    unlocked: false,
  },
];
