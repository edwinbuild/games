// The word list loads with the game page (not part of the page's code): about 17,500 common
// words of 3 to 7 letters from SCOWL, filtered. Lines starting with # are the list's notice; the
// line starting with ! holds the starting words (common seven-letter words with plenty inside).
export type WordList = { words: Set<string>; seeds: string[] }
export function parseWords(text: string): WordList {
  const lines = text.split('\n')
  return {
    words: new Set(lines.filter((l) => l && !l.startsWith('#') && !l.startsWith('!'))),
    seeds: (lines.find((l) => l.startsWith('!')) ?? '!').slice(1).split(' ').filter(Boolean),
  }
}
let loading: Promise<WordList> | null = null
export function loadWords(): Promise<WordList> {
  loading ??= fetch('/words/letter-race.txt')
    .then((r) => { if (!r.ok) throw new Error(`word list ${r.status}`); return r.text() })
    .then(parseWords)
    .catch((e) => { loading = null; throw e })
  return loading
}
