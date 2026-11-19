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

const hit = (t: string) => BLOCKED.some((w) => t === w || t === w + 's' || t === w + 'es' || (w.length >= 5 && t.includes(w)))

/**
 * Whether the text contains a blocked word: matched word by word (so innocent words that merely
 * contain one, like "grapes", pass), with letter swaps undone, and spelled-out letters
 * ("s h i t") joined back together.
 */
export function isBlocked(text: string): boolean {
  const tokens = text.split(/\s+/).filter(Boolean)
  if (tokens.some((t) => hit(squash(t)))) return true
  // Letters spread out with spaces: join runs of single characters and check those too.
  const runs = text.split(/\s{2,}/).map((part) => part.split(/\s+/)).filter((r) => r.length > 1 && r.every((c) => c.length === 1))
  return runs.some((r) => hit(squash(r.join(''))))
}

/** Text safe to show to other players: trimmed to `max` characters, or "•••" if blocked. */
export function clean(text: string, max = 24): string {
  const t = text.trim().slice(0, max)
  return isBlocked(t) ? '•••' : t
}
