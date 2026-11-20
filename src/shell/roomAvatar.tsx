// A room member's icon (signed-in players), for lobby lists. Online games only.
import type { Member } from './room'
import { Avatar } from '../ui/icons'

export const avatarOf = (m: Member) => (m.icon ? <Avatar icon={m.icon} colour={m.colour} size={28} label={`${m.name}'s icon`} /> : undefined)
