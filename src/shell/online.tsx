// Pieces every online game shares: the room in the URL, the create/join screen and notices.
import { useState } from 'react'
import type { GameMeta } from '../games/registry'
import { cleanCode, isRoomCode, newRoomCode } from './room'
import { siteConfig } from './config'
import { Button, Stage, TextField } from '../ui/components'

export function roomFromUrl(): string | null {
  if (!siteConfig().rooms) return null
  const c = cleanCode(new URLSearchParams(location.search).get('room') ?? '')
  return isRoomCode(c) ? c : null
}
export function goToRoom(code: string | null) {
  history.replaceState(null, '', code ? `${location.pathname}?room=${code}` : location.pathname)
}

export function RoomLanding({ game, intro, onRoom }: { game: GameMeta; intro: string; onRoom: (code: string) => void }) {
  const [typed, setTyped] = useState('')
  const valid = isRoomCode(cleanCode(typed))
  if (!siteConfig().rooms) {
    return <Stage><p className="body" style={{ margin: 0 }}>Online rooms are taking a short break. Try again a little later, or play on one phone.</p></Stage>
  }
  return (
    <Stage>
      <div className="stack">
        <p className="body" style={{ margin: 0 }}>{intro}</p>
        <Button size="lg" block color={game.color} onClick={() => onRoom(newRoomCode())} data-primary="click" hint="Space">Create a room</Button>
        <form className="stack" onSubmit={(e) => { e.preventDefault(); if (valid) onRoom(cleanCode(typed)) }}>
          <TextField id="room-code" label="Or join with a code" value={typed} onChange={(v) => setTyped(cleanCode(v))} placeholder="5 letters, e.g. K7MQ2" maxLength={5} />
          <Button type="submit" variant="secondary" disabled={!valid}>Join room</Button>
        </form>
      </div>
    </Stage>
  )
}

export function RoomNotice({ game, text, onLeave }: { game: GameMeta; text: string; onLeave: () => void }) {
  return (
    <Stage>
      <div className="stack">
        <p className="body-strong" style={{ margin: 0 }}>{text}</p>
        <Button size="lg" block color={game.color} onClick={onLeave}>Create or join another room</Button>
      </div>
    </Stage>
  )
}
