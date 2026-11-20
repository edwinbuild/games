// The signed-in player's profile: read and changed through the database, kept in this browser so
// the top bar can show it at once. Loaded with the account screens, not on every page.
import { rpc } from './api'
import { boardKey } from './board'
import { dateKey } from './daily'
import { load, save } from './storage'

export type Profile = {
  username: string | null
  changesLeft: number
  icon: string
  colour: string
  unlocked: string[]
  inviteCode: string
  streak: number
  incoming: number
  /** Unseen reactions and fresh game invites. */
  news?: number
}

export const cachedProfile = () => load<Profile | null>('profile', null)
function keep(p: Profile): Profile {
  save('profile', p)
  window.dispatchEvent(new Event('qg:profile'))
  return p
}

export const refreshProfile = () => rpc<Profile>('my_profile', { p_today: dateKey() }).then(keep)
export const setUsername = (name: string) => rpc<Profile>('set_username', { p_name: name }).then(keep)
export const setIcon = (icon: string, colour: string) => rpc<Profile>('set_icon', { p_icon: icon, p_colour: colour }).then(keep)
/** Why a username can't be used (format, reserved, rude, taken, held), or null when it's free. */
export const checkUsername = (name: string) => rpc<string | null>('check_username', { p_name: name })
export const reportUsername = (name: string) => rpc<boolean>('report_username', { p_name: name })

/** On first sign-in on this device: this browser's guest board results become the player's. */
export async function claimThisDevice(): Promise<void> {
  if (!load<string>('board-key', '')) return
  await rpc('claim_device', { p_key: boardKey() })
}

export async function deleteAccount(): Promise<void> {
  await rpc('delete_account')
}

/** What each username problem means, in words. */
export const USERNAME_PROBLEM: Record<string, string> = {
  format: 'Use 3 to 16 letters, numbers or _ (no spaces).',
  reserved: 'That name is reserved. Try another.',
  rude: 'Please pick a different name.',
  taken: 'Someone already has that name.',
  held: 'That name was recently given up; it’s kept for its owner for 30 days.',
}
/** The problem named in a database error ("username taken" → taken). */
export const problemOf = (e: unknown) => /username (\w+)/.exec(String((e as Error)?.message ?? e))?.[1] ?? null
