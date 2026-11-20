// The word lists load with the game (not part of the page's code): about 5,000 five-letter words
// that count as guesses, and 890 common ones the hidden words come from (the line starting with !).
export type WordList = { guesses: Set<string>; answers: string[] }
export function parseWords(text: string): WordList {
  const lines = text.split('\n')
  return {
    guesses: new Set(lines.filter((l) => l && !l.startsWith('#') && !l.startsWith('!'))),
    answers: (lines.find((l) => l.startsWith('!')) ?? '!').slice(1).split(' ').filter(Boolean),
  }
}
let loading: Promise<WordList> | null = null
export function loadWords(): Promise<WordList> {
  loading ??= fetch('/words/hidden-word.txt')
    .then((r) => { if (!r.ok) throw new Error(`word list ${r.status}`); return r.text() })
    .then(parseWords)
    .catch((e) => { loading = null; throw e })
  return loading
}
