// The A1 teacher-led course (PROJECT.md §15). Authored teaching-session spines.
// Right now: a1-s11 (the proof-of-system session). The full ~52-session A1 map
// (Rivstart order) is authored in Phase 3; new sessions just slot into this list.
import a1s11 from './a1-s11';

export const SESSIONS = {
  [a1s11.id]: a1s11,
};

// Display order for the Course map. Linear: a session unlocks when the previous is done.
export const A1_ORDER = ['a1-s11'];

export function getSession(id) {
  return SESSIONS[id] || null;
}
