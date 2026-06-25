# A1 Session Map — the course backbone (authoring reference)

**This is the to-do list for completing the A1 course.** It is the complete, ordered set of **52 deep
teaching sessions** across **10 units** that together cover EVERYTHING a Rivstart A1 course teaches (full
A1 grammar + functional themes + pronunciation/alphabet/numbers + ~500 Kelly-list core words). Authoring
all of these = a genuinely complete, certification-ready A1. See PROJECT.md §15 for the session system.

## How to author each session (the next step)
1. Each row below becomes one authored session **spine** file `src/data/curriculum/a1/a1-sNN.js`, where
   **NN = the session number** in this map. Use **`a1-s11.js` as the template** (it's already built and live).
2. A spine contains the 100%-correct **grammarFacts** (rule + paradigm table + commonErrors), the
   **examplesSeed**, `introducesWords`, and the **steps** plan (intro → warmup → concept → check → drill →
   pitfall → produce → recap → complete). The LLM ("Astrid") writes the warm teaching prose at runtime from
   these facts; the native-Swedish QA pass verifies it; drills come from the live `/practice` engine.
3. Add the new id to **`A1_ORDER`** in `src/data/curriculum/a1/index.js` (keep them in map order 1→52) and
   register it in `SESSIONS`. Sessions unlock linearly.
4. **Verify each authored spine** with the native-Swedish-teacher workflow (as in `verify-a1-lessons`) —
   genders, paradigm forms, builder answers, translations must be correct before shipping.
5. New verb-drill modes the map needs from the engine (add to `server/src/generate.js`): **modal+infinitive**
   (#47), **supine** (#50), **preterite** (#51). The four live drill types: **EE** en/ett, **NF** noun
   definite/plural transform, **VC** present-tense verb conjugation, **CZ** cloze.

**Status:** `a1-s11` authored + live (the template). The other **51 sessions are TO AUTHOR.** Suggested order:
do **#1–#10** (Unit 0 foundations + Unit 1 greetings) first so the course has a real beginning, then #12→#52.

---

## UNIT 0 — Foundations: sounds, alphabet, numbers
| # | Title | Grammar / system | Vocab & functions | Drills |
|---|-------|------------------|-------------------|--------|
| 1 | Welcome to Swedish | Swedish vs English; å ä ö exist | cognates (hus, bok, vatten); "I'm learning Swedish" | CZ |
| 2 | The alphabet & extra letters | 29-letter alphabet; å/ä/ö names & sounds; spelling aloud | letter names; "Hur stavar man…?" | CZ |
| 3 | Vowels: long vs short | 9 vowels; long/short; a/o/u/å hard, e/i/y/ä/ö soft | minimal pairs (vit/vitt, glas/glass) | CZ |
| 4 | Tricky consonants | sj-/skj-/stj-, tj-/k+soft, g/k before soft vowels, rs | sjö, kö, gärna, sju | CZ |
| 5 | Numbers 0–20 | cardinals 0–20 | räkna; phone numbers | CZ |
| 6 | Numbers 20–1000, prices, age | tens/hundreds, "och" in numbers; "Hur gammal är du?" | kronor, pris, år | CZ |

## UNIT 1 — Greetings & introducing yourself (Rivstart kap. 1)
| # | Title | Grammar | Vocab & functions | Drills |
|---|-------|---------|-------------------|--------|
| 7 | Hej! Greetings & farewells | fixed phrases; formal vs informal | hej, hej då, god morgon, tack, ursäkta | CZ |
| 8 | Jag heter… | pronouns jag/du/han/hon; verb heta/vara (present intro) | "Jag heter…", "Vad heter du?" | VC, CZ |
| 9 | Var kommer du ifrån? | verb komma/tala/prata; "från + country" | länder, språk | VC, CZ |
| 10 | Yrke & att bo | bo/jobba/arbeta; "i + city"; jag är lärare | yrken, städer | EE, VC, CZ |

## UNIT 2 — En or ett? Nouns & articles (Rivstart kap. 2)
| # | Title | Grammar | Vocab & functions | Drills |
|---|-------|---------|-------------------|--------|
| **11** | **En and ett — the two genders** ✅ BUILT | common (en) vs neuter (ett); learn per word | en bil, ett hus, en bok, ett bord | **EE**, CZ |
| 12 | Things around you | reinforce en/ett; "Det här är en/ett…" | penna, bord, fönster, stol, dörr | EE, CZ |
| 13 | Det är / Det finns | "det är" vs "det finns"; "Finns det…?" | rum, sak; "Vad är det?" | CZ, EE |
| 14 | This and that — den/det/de här | den här / det här / de här; agreement | närhet/avstånd | EE, CZ |

## UNIT 3 — The definite form (Rivstart kap. 2–3)
| # | Title | Grammar | Vocab & functions | Drills |
|---|-------|---------|-------------------|--------|
| 15 | Definite singular -en/-et | bilen, huset; vowel nouns (flicka→flickan) | recycled nouns | NF, EE, CZ |
| 16 | Indefinite vs definite in use | new vs known info; English contrast | discourse markers | NF, CZ |
| 17 | My home — rooms & furniture | definite in context; i/på preview | kök, sovrum, soffa, säng, badrum | NF, CZ, EE |

## UNIT 4 — Plurals & numbers in context (Rivstart kap. 3)
| # | Title | Grammar | Vocab & functions | Drills |
|---|-------|---------|-------------------|--------|
| 18 | Plural overview — 5 declensions | -or/-ar/-er/-n/-∅; gender hints | recycled by group | NF, EE |
| 19 | Plural group 1 & 2 (-or, -ar) | flicka→flickor, bil→bilar | everyday en-nouns | NF, CZ |
| 20 | Plural group 3,4,5 (-er,-n,zero) | loanwords -er, äpple→äpplen, hus→hus; man→män, barn | mixed + irregulars | NF, CZ |
| 21 | Definite plural | bilarna, husen, äpplena | recycled | NF, CZ |
| 22 | Hur många? — shopping | numbers + plural; "Jag vill ha…", "Hur mycket kostar…?" | mat & affär | NF, CZ, EE |

## UNIT 5 — Verbs & present tense, V2 word order (Rivstart kap. 4)
| # | Title | Grammar | Vocab & functions | Drills |
|---|-------|---------|-------------------|--------|
| 23 | Present tense — one form | stem + -r/-ar/-er; no person agreement | heta, bo, jobba, tala | VC, CZ |
| 24 | The 4 verb groups | gp1 -ar, gp2 -er, gp3 -r, gp4 strong | ~20 core verbs | VC, CZ |
| 25 | Common irregular verbs | är, har, gör, går, ser, vet, säger, vill | the essentials | VC, CZ |
| 26 | Straight word order (SVO) | subject–verb–object; verb 2nd basics | sentence vocab | CZ, VC |
| 27 | V2 & inversion | time/place first → verb stays 2nd ("Idag jobbar jag") | idag, nu, ofta | CZ, VC |
| 28 | A day's verbs — daily routine | present + V2; reflexive preview | vaknar, äter, sover, går till jobbet | VC, CZ |

## UNIT 6 — Questions & negation (Rivstart kap. 4–5)
| # | Title | Grammar | Vocab & functions | Drills |
|---|-------|---------|-------------------|--------|
| 29 | Yes/no questions — verb first | inversion; ja/nej/jo | — | CZ, VC |
| 30 | Question words | vad/vem/var/vart/när/hur/varför/vilken; v-word+verb+subject | info phrases | CZ |
| 31 | Negation with inte | inte after finite verb ("Jag bor inte här") | — | CZ, VC |
| 32 | Connectors | också / inte heller; och/men/eller/för | linking phrases | CZ |

## UNIT 7 — Time, days & the clock (Rivstart kap. 5)
| # | Title | Grammar | Vocab & functions | Drills |
|---|-------|---------|-------------------|--------|
| 33 | Days, months, seasons | no article with days; "på måndag" | veckodagar, månader, årstider | CZ, EE |
| 34 | Telling the time | klockan; halv/kvart i/över; 24h | klockan, timme, minut | CZ |
| 35 | Prepositions of time | i / på / om / för…sedan / klockan | time expressions | CZ |
| 36 | Making plans | V2 + time; "Ska vi…?", "Vill du…?" (modal preview) | träffas, boka, fika | CZ, VC |

## UNIT 8 — Adjectives & describing (Rivstart kap. 6)
| # | Title | Grammar | Vocab & functions | Drills |
|---|-------|---------|-------------------|--------|
| 37 | Adjective agreement (indef.) | en stor bil / ett stort hus / stora bilar | stor, liten, ny, gammal, fin | CZ, EE |
| 38 | Definite adjective form | den stora bilen (double definiteness) | recycled | CZ, NF |
| 39 | Irregular adjectives & colours | liten/litet/lilla/små; bra; röd/rött/röda | färger | CZ |
| 40 | Describing people | agreement applied; "Han är lång och har…" | kropp & utseende | CZ, EE |
| 41 | Comparing | -are/-ast; bra→bättre→bäst, dålig→sämre | comparison phrases | CZ |

## UNIT 9 — Possessives, family & "having" (Rivstart kap. 6–7)
| # | Title | Grammar | Vocab & functions | Drills |
|---|-------|---------|-------------------|--------|
| 42 | Possessive pronouns | min/mitt/mina, din/ditt/dina, hans/hennes, vår/er/deras | — | CZ, EE |
| 43 | The family | possessives + family nouns + definite/plural | mamma, pappa, syster, bror, barn | NF, CZ |
| 44 | Genitive -s & sin/sitt/sina | Annas bok; reflexive possessive intro | — | CZ |
| 45 | Object pronouns | mig, dig, honom, henne, oss, er, dem | — | CZ |

## UNIT 10 — Daily life, prepositions, modals & the past (Rivstart kap. 7–8)
| # | Title | Grammar | Vocab & functions | Drills |
|---|-------|---------|-------------------|--------|
| 46 | Prepositions of place | i/på/under/bredvid; "i" vs "på" | placering vocab | CZ, EE |
| 47 | Modal verbs | kan/vill/ska/måste/får + infinitive (no -r on 2nd verb) | ability/wish/obligation | **VC modal+inf**, CZ |
| 48 | Food, restaurant & café | modals + "vill ha"; en/ett food nouns | beställa, meny, nota, fika | EE, CZ, NF |
| 49 | Shopping & clothes | adjective agreement + plurals + prices | tröja, byxor, skor, jacka | NF, CZ, EE |
| 50 | The past — perfect (har + supinum) | har + supine by group (-at/-t/-tt/strong) | recap verbs | **VC supine**, CZ |
| 51 | The past — preteritum | preterite by group (-ade/-de/-te/strong) | igår, förra veckan | **VC preterite**, CZ |
| 52 | The future & putting it together | kommer att / ska + infinitive; integrate all | imorgon, nästa vecka; free production | CZ, VC, mixed |

## END OF LEVEL
**A1 Exam (Examiner):** per-skill check (reading/listening/writing/grammar-production) drawing
generated+verified items from every unit. Pass → A1 certificate → unlocks A2. (PROJECT.md §14/§15 Phase 4.)

## Design notes
- **Order = Rivstart A1.** Sounds/numbers first; gender→definite→plural is the noun spine; present tense + **V2**
  is the verb spine (the biggest A1 hurdle, a whole unit); questions/negation unlock dialogue; then time,
  adjectives, possessives, prepositions, modals, past/future. Each point is taught → drilled → recycled later.
- **~500 Kelly A1 words** are distributed across the topic sessions (home #17, shopping #22/#49, family #43,
  food #48, people #40, time #33–34, countries/jobs #9–10), entering as the material grammar is practised on.
- A2→C1 reuse the exact same machinery — author each level's session map the same way.
