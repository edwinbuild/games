// A player in a friends list: icon, username, one line of detail, and actions on the right.
import type { ReactNode } from 'react'
import { Avatar } from './icons'

export type FriendRowProps = { f: { username: string; icon?: string | null; colour?: string | null; detail?: string }; children?: ReactNode }
export function FriendRow({ f, children }: FriendRowProps) {
  return (
    <li className="qg-friend">
      <Avatar icon={f.icon} colour={f.colour} size={40} />
      <span className="qg-friend-text"><strong>{f.username}</strong>{f.detail && <span className="small muted">{f.detail}</span>}</span>
      {children && <span className="qg-friend-actions">{children}</span>}
    </li>
  )
}
