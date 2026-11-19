// A small filter for words players type to each other in online rooms (guesses, names).
// It is deliberately short and blunt: room chat is between friends, and anything caught shows as "•••".
const BLOCKED = [
  'fuck', 'shit', 'cunt', 'bitch', 'bastard', 'dick', 'cock', 'pussy', 'whore', 'slut', 'fag', 'faggot',
  'nigger', 'nigga', 'retard', 'rape', 'nazi', 'kike', 'spic', 'chink', 'tranny', 'wank', 'twat', 'porn',
]
const SWAPS: Record<string, string> = { '@': 'a', '4': 'a', '3': 'e', '1': 'i', '!': 'i', '0': 'o', '$': 's', '5': 's', '7': 't', '+': 't' }

/** Lower-case, letter swaps undone, and everything but letters removed. */
export function squash(text: string): string {
  return text.toLowerCase().replace(/[@4310!$57+]/g, (c) => SWAPS[c] ?? c).replace(/[^a-z]/g, '')
}

/** Whether the text contains a blocked word, even with spaces, dots or letter swaps in it. */
export function isBlocked(text: string): boolean {
  const s = squash(text)
  return BLOCKED.some((w) => s.includes(w))
}

/** Text safe to show to other players: trimmed to `max` characters, or "•••" if blocked. */
export function clean(text: string, max = 24): string {
  const t = text.trim().slice(0, max)
  return isBlocked(t) ? '•••' : t
}
