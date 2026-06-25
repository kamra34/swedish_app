// A pool of everyday A1 settings. The app picks a few at random and asks the AI
// to write a fresh scene for each — so the suggestions actually vary each time
// (the model alone tended to repeat the same first few).
export const SCENE_TOPICS = [
  'ordering coffee at a café',
  'buying bread at a bakery',
  'on the bus',
  'meeting a new neighbour',
  'at the market',
  'asking a stranger for directions',
  'at the doctor',
  'talking about the weather',
  'at a clothes shop',
  'introducing your family',
  'ordering food at a restaurant',
  'at the gym',
  'buying a train ticket',
  'a phone call to a friend',
  'at the library',
  'talking about your hobbies',
  'at the pharmacy',
  'checking in at a hotel',
  'asking about opening hours',
  'at a birthday party',
  'in a taxi',
  'at the post office',
  'planning the weekend',
  'at the supermarket checkout',
];

export function pickTopics(n = 4) {
  const a = [...SCENE_TOPICS];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}
