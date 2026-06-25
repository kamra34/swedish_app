// All teaching content lives here as data, so adding lessons later is
// just adding entries — no UI changes needed.
//
// Sequence follows the Rivstart A1+A2 theme order (blueprint only — all text is
// original), grammar progression after Form i fokus A, vocab from the Kelly list.
// Each lesson: grammar note → vocabulary → Sentence Builder rounds → done.

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
    done: 'You can now greet someone and say your name in Swedish.',
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
    unlocked: true,
    done: 'You can now ask and say where someone is from, and name a few languages.',
    grammar: {
      title: 'Saying where you\'re from',
      body: [
        'To ask "where from?", Swedish uses one word: "Varifrån?". The question word comes first.',
        '"Jag kommer från…" = "I come from…". "Jag bor i…" = "I live in…".',
        'For languages, use "Jag talar…" (I speak…). Most language names end in -ska and are lowercase: svenska, engelska, spanska.',
      ],
      examples: [
        { sv: 'Varifrån kommer du?', en: 'Where do you come from?' },
        { sv: 'Jag kommer från Sverige.', en: 'I come from Sweden.' },
        { sv: 'Jag talar svenska och engelska.', en: 'I speak Swedish and English.' },
      ],
    },
    vocab: [
      { sv: 'varifrån', en: 'from where' },
      { sv: 'kommer', en: 'come(s)' },
      { sv: 'från', en: 'from' },
      { sv: 'bor', en: 'live(s)' },
      { sv: 'i', en: 'in' },
      { sv: 'talar', en: 'speak(s)' },
      { sv: 'och', en: 'and' },
      { sv: 'Sverige', en: 'Sweden' },
      { sv: 'svenska', en: 'Swedish (language)' },
      { sv: 'engelska', en: 'English (language)' },
    ],
    builder: [
      {
        prompt: 'Where do you come from?',
        hint: '"From where" → verb → you',
        answer: ['Varifrån', 'kommer', 'du'],
        tip: 'Varifrån kommer du? The question word leads, then the verb.',
      },
      {
        prompt: 'I come from Sweden.',
        hint: 'Subject → verb → "from" → country',
        answer: ['Jag', 'kommer', 'från', 'Sverige'],
        tip: 'Jag kommer från Sverige.',
      },
      {
        prompt: 'I live in Sweden.',
        hint: 'Subject → verb → "in" → country',
        answer: ['Jag', 'bor', 'i', 'Sverige'],
        tip: 'Jag bor i Sverige. "bor i" = live in.',
      },
      {
        prompt: 'I speak Swedish and English.',
        hint: 'Subject → verb → language → and → language',
        answer: ['Jag', 'talar', 'svenska', 'och', 'engelska'],
        tip: 'Languages are lowercase: svenska, engelska.',
      },
    ],
  },

  {
    id: 'a1-3',
    level: 'A1',
    index: 3,
    title: 'En eller ett? — Substantiv',
    subtitle: 'Noun genders (the en/ett game)',
    unlocked: true,
    done: 'You now know that every noun is an "en" or "ett" word — and you can say "a car", "a house" and more.',
    grammar: {
      title: 'Every noun is "en" or "ett"',
      body: [
        'Swedish nouns come in two genders. Most (about 75%) take "en", the rest take "ett".',
        '"en" / "ett" also mean "a / an": en bil = a car, ett hus = a house.',
        'There is no sound-rule for it — always learn a noun together WITH its en/ett. That gender comes back again and again.',
      ],
      examples: [
        { sv: 'en bil', en: 'a car' },
        { sv: 'ett hus', en: 'a house' },
        { sv: 'en katt', en: 'a cat' },
      ],
    },
    vocab: [
      { sv: 'en bil', en: 'a car' },
      { sv: 'ett hus', en: 'a house' },
      { sv: 'en katt', en: 'a cat' },
      { sv: 'en hund', en: 'a dog' },
      { sv: 'ett bord', en: 'a table' },
      { sv: 'en bok', en: 'a book' },
      { sv: 'ett äpple', en: 'an apple' },
      { sv: 'ett barn', en: 'a child' },
      { sv: 'har', en: 'have / has' },
      { sv: 'det', en: 'it / that' },
    ],
    builder: [
      {
        prompt: 'a car',
        hint: 'Which article — en or ett?',
        answer: ['en', 'bil'],
        tip: '"bil" is an en-word: en bil.',
      },
      {
        prompt: 'a house',
        hint: 'Which article — en or ett?',
        answer: ['ett', 'hus'],
        tip: '"hus" is an ett-word: ett hus.',
      },
      {
        prompt: 'I have a dog.',
        hint: 'I → have → a → dog',
        answer: ['Jag', 'har', 'en', 'hund'],
        tip: '"hund" is an en-word: en hund.',
      },
      {
        prompt: 'It is an apple.',
        hint: 'It → is → an → apple',
        answer: ['Det', 'är', 'ett', 'äpple'],
        tip: '"Det är…" = "It is…". "äpple" is an ett-word.',
      },
    ],
  },

  {
    id: 'a1-4',
    level: 'A1',
    index: 4,
    title: 'Bilen & huset — Bestämd form',
    subtitle: 'Saying "the" (definite form)',
    unlocked: true,
    done: 'You can now say "the car", "the house", and point things out — "the dog is there".',
    grammar: {
      title: '"The" is an ending, not a word',
      body: [
        'In Swedish "the" is glued onto the END of the noun — there is no separate word for "the".',
        'en-words add -en:  en bil → bilen (the car).  ett-words add -et:  ett hus → huset (the house).',
        'So the en/ett gender decides the ending. (If the word already ends in -e, just add -n or -t: äpple → äpplet.)',
      ],
      examples: [
        { sv: 'bilen', en: 'the car' },
        { sv: 'huset', en: 'the house' },
        { sv: 'katten', en: 'the cat' },
      ],
    },
    vocab: [
      { sv: 'bilen', en: 'the car' },
      { sv: 'huset', en: 'the house' },
      { sv: 'katten', en: 'the cat' },
      { sv: 'hunden', en: 'the dog' },
      { sv: 'bordet', en: 'the table' },
      { sv: 'boken', en: 'the book' },
      { sv: 'äpplet', en: 'the apple' },
      { sv: 'barnet', en: 'the child' },
      { sv: 'här', en: 'here' },
      { sv: 'där', en: 'there' },
    ],
    builder: [
      {
        prompt: 'the car',
        hint: 'en bil → ?',
        answer: ['bilen'],
        tip: 'en-word + -en → bilen.',
      },
      {
        prompt: 'the house',
        hint: 'ett hus → ?',
        answer: ['huset'],
        tip: 'ett-word + -et → huset.',
      },
      {
        prompt: 'The car is here.',
        hint: 'the car → is → here',
        answer: ['Bilen', 'är', 'här'],
        tip: 'Bilen är här.',
      },
      {
        prompt: 'The dog is there.',
        hint: 'the dog → is → there',
        answer: ['Hunden', 'är', 'där'],
        tip: 'Hunden är där.',
      },
    ],
  },

  {
    id: 'a1-5',
    level: 'A1',
    index: 5,
    title: 'Siffror & flera — Plural',
    subtitle: 'Numbers and more than one',
    unlocked: true,
    done: 'You can count to ten and make plurals — "two cars", "three apples".',
    grammar: {
      title: 'Numbers and "more than one"',
      body: [
        'Counting 0–10: noll, en/ett, två, tre, fyra, fem, sex, sju, åtta, nio, tio.',
        'To make a plural, most en-words add -ar or -er (en bil → bilar, en katt → katter). ett-words ending in a vowel add -n (ett äpple → äpplen).',
        'A few short ett-words don\'t change at all: ett barn → två barn.',
      ],
      examples: [
        { sv: 'en bil → två bilar', en: 'one car → two cars' },
        { sv: 'ett äpple → tre äpplen', en: 'one apple → three apples' },
        { sv: 'ett barn → två barn', en: 'one child → two children' },
      ],
    },
    vocab: [
      { sv: 'noll', en: 'zero' },
      { sv: 'två', en: 'two' },
      { sv: 'tre', en: 'three' },
      { sv: 'fyra', en: 'four' },
      { sv: 'fem', en: 'five' },
      { sv: 'sex', en: 'six' },
      { sv: 'sju', en: 'seven' },
      { sv: 'åtta', en: 'eight' },
      { sv: 'nio', en: 'nine' },
      { sv: 'tio', en: 'ten' },
    ],
    builder: [
      {
        prompt: 'two cars',
        hint: 'number → plural noun',
        answer: ['två', 'bilar'],
        tip: 'en bil → två bilar (add -ar).',
      },
      {
        prompt: 'three apples',
        hint: 'number → plural noun',
        answer: ['tre', 'äpplen'],
        tip: 'ett äpple → tre äpplen (add -n).',
      },
      {
        prompt: 'I have two cats.',
        hint: 'I → have → two → cats',
        answer: ['Jag', 'har', 'två', 'katter'],
        tip: 'en katt → två katter (add -er).',
      },
      {
        prompt: 'five children',
        hint: 'number → plural (no change!)',
        answer: ['fem', 'barn'],
        tip: 'ett barn → fem barn — this one doesn\'t change.',
      },
    ],
  },

  {
    id: 'a1-6',
    level: 'A1',
    index: 6,
    title: 'Min familj — Possessiva',
    subtitle: 'Family & saying "my / your"',
    unlocked: true,
    done: 'You can introduce your family and say "my" and "your" correctly — min, mitt, mina.',
    grammar: {
      title: 'Saying "my" and "your"',
      body: [
        '"My" changes with the noun: min (en-word), mitt (ett-word), mina (plural). E.g. min bror, mitt hus, mina barn.',
        '"Your" works exactly the same way: din, ditt, dina.',
        'So once again, the en/ett gender you learned decides the form.',
      ],
      examples: [
        { sv: 'min bror', en: 'my brother' },
        { sv: 'mitt hus', en: 'my house' },
        { sv: 'mina barn', en: 'my children' },
      ],
    },
    vocab: [
      { sv: 'familj', en: 'family' },
      { sv: 'mamma', en: 'mum' },
      { sv: 'pappa', en: 'dad' },
      { sv: 'syster', en: 'sister' },
      { sv: 'bror', en: 'brother' },
      { sv: 'min', en: 'my (en-word)' },
      { sv: 'mitt', en: 'my (ett-word)' },
      { sv: 'mina', en: 'my (plural)' },
      { sv: 'din', en: 'your (en-word)' },
      { sv: 'ditt', en: 'your (ett-word)' },
    ],
    builder: [
      {
        prompt: 'my brother',
        hint: '"bror" is an en-word',
        answer: ['min', 'bror'],
        tip: 'en-word → min: min bror.',
      },
      {
        prompt: 'my house',
        hint: '"hus" is an ett-word',
        answer: ['mitt', 'hus'],
        tip: 'ett-word → mitt: mitt hus.',
      },
      {
        prompt: 'This is my mum.',
        hint: 'This is → my → mum',
        answer: ['Det', 'är', 'min', 'mamma'],
        tip: 'Det är min mamma. "mamma" is an en-word.',
      },
      {
        prompt: 'my children',
        hint: 'plural → mina',
        answer: ['mina', 'barn'],
        tip: 'plural → mina: mina barn.',
      },
    ],
  },

  // ── Coming next (locked until authored) ──────────────────────────────
  {
    id: 'a1-7',
    level: 'A1',
    index: 7,
    title: 'En vanlig dag — Verb i presens',
    subtitle: 'Daily routine & present-tense verbs',
    unlocked: false,
  },
  {
    id: 'a1-8',
    level: 'A1',
    index: 8,
    title: 'Vad är klockan? — Tid',
    subtitle: 'Telling the time, days & parts of the day',
    unlocked: false,
  },
];
