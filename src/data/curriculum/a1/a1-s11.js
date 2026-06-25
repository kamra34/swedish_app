// Authored session SPINE (PROJECT.md §15). The FACTS, paradigm table, examples,
// pitfalls and answer keys are 100% correct and NEVER AI-generated. The backend's
// teacher (Astrid) writes the warm, deep teaching prose FROM these facts (verified
// + cached); structural steps (check/drill/produce/complete) render from this spec.
export default {
  id: 'a1-s11',
  level: 'A1',
  unitId: 'a1-u2',
  index: 11,
  title: 'En eller ett? — Substantivens genus',
  canDo: 'Choose en or ett before a noun, and understand why every noun has a fixed gender.',
  version: 1, // bump to regenerate cached teaching prose
  introducesWords: ['bil', 'hus', 'katt', 'hund', 'bord', 'bok', 'äpple', 'barn'],

  // ── THE FACTS — authored ground truth the teacher must not contradict ──
  grammarFacts: [
    {
      id: 'noun-gender-en-ett',
      rule: 'Every Swedish noun has a fixed gender: it is either an "en"-word or an "ett"-word. About 75% are en-words. Both en and ett mean "a/an". There is no reliable rule from a word\'s sound or spelling, so you learn each noun together with its en/ett.',
      paradigm: {
        caption: 'The two genders (both mean "a / an")',
        columns: ['gender', 'share', 'examples'],
        rows: [
          ['en', '~75%', 'en bil, en katt, en hund, en bok'],
          ['ett', '~25%', 'ett hus, ett bord, ett äpple, ett barn'],
        ],
      },
      commonErrors: [
        { wrong: 'en hus', right: 'ett hus', why: '"hus" is an ett-word.' },
        { wrong: 'ett katt', right: 'en katt', why: '"katt" is an en-word.' },
      ],
    },
  ],
  examplesSeed: [
    { sv: 'en bil', en: 'a car' },
    { sv: 'ett hus', en: 'a house' },
    { sv: 'Jag har en hund.', en: 'I have a dog.' },
    { sv: 'Det är ett äpple.', en: 'It is an apple.' },
  ],

  // ── THE STEPS — the lesson plan Astrid walks the student through ──
  steps: [
    { id: 's1', kind: 'intro', focus: 'Why en/ett matters: it comes back in "the", "my", plurals, adjectives — getting it now pays off forever.' },
    { id: 's2', kind: 'warmup', recall: { prompt_en: 'How did you say “I have a dog”?', answer_sv: 'Jag har en hund.', note: 'You already used "en" — now we make it conscious.' } },
    { id: 's3', kind: 'concept', teaches: 'noun-gender-en-ett', focus: 'The two genders; both mean a/an; ~75% are en; no sound rule, so learn the gender WITH the word.' },
    {
      id: 's4', kind: 'check',
      question: 'Which is correct?',
      options: ['en hus', 'ett hus'],
      answer: 1,
      explain_right: 'Yes — “hus” is an ett-word, so “ett hus”.',
      explain_wrong: 'Not quite — “hus” is an ett-word, so it must be “ett hus”.',
    },
    { id: 's5', kind: 'drill', drill: { type: 'en_ett', count: 4, seedWords: ['bil', 'hus', 'katt', 'bord', 'barn'], passThreshold: 0.6 } },
    { id: 's6', kind: 'pitfall', focus: 'The classic traps: “en hus” and “ett katt”. Show ✗ vs ✓ and why each is tempting.' },
    {
      id: 's7', kind: 'produce', format: 'builder',
      builder: { prompt: 'I have a cat.', hint: 'I → have → a → cat', answer: ['Jag', 'har', 'en', 'katt'], tip: '“katt” is an en-word, so “en katt”.' },
    },
    { id: 's8', kind: 'recap', focus: 'Two genders; both mean a/an; ~75% en; learn the gender with each new noun.' },
    { id: 's9', kind: 'complete', nextSessionId: null, outcome: 'You can now choose en or ett and you understand why Swedish nouns have a fixed gender.' },
  ],
};
