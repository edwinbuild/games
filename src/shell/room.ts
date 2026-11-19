// Online rooms over Supabase Realtime (broadcast + presence). No database tables:
// a room exists while players are connected to the channel `room:<game>:<code>`.
// Only online games import this file, so other pages don't load the realtime client.
import { RealtimeClient, type RealtimeChannel } from '@supabase/realtime-js'
import { useEffect, useMemo, useRef, useState } from 'react'
import { SITE } from '../site'
import { myId, myName } from './challenge'

export type Member = { id: string; name: string; ready: boolean; joinedAt: number; started?: string[] }
export type RoomStatus = 'connecting' | 'open' | 'full' | 'started' | 'error'

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
export const newRoomCode = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')
export const cleanCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5)
export const isRoomCode = (c: string) => new RegExp(`^[${ALPHABET}]{5}$`).test(c)

let client: RealtimeClient | null = null
function realtime() {
  client ??= new RealtimeClient(`${SITE.api.url.replace(/^http/, 'ws')}/realtime/v1`, { params: { apikey: SITE.api.key } })
  return client
}

/** Members in join order; the first one is the host. */
export function order(members: Member[]): Member[] {
  return [...members].sort((a, b) => a.joinedAt - b.joinedAt || a.id.localeCompare(b.id))
}

const readSession = (k: string) => { try { return sessionStorage.getItem(k) } catch { return null } }
const writeSession = (k: string, v: string | null) => { try { if (v == null) sessionStorage.removeItem(k); else sessionStorage.setItem(k, v) } catch { /* storage off */ } }

type Handler = (payload: Record<string, unknown>, from: string) => void

/**
 * Joins a room and keeps the member list. `max` players; anyone beyond that, or
 * anyone arriving after the host started (and not in the starting line-up), is turned away.
 */
export function useRoom(game: string, code: string | null, max: number) {
  const me = useMemo(myId, [])
  const [members, setMembers] = useState<Member[]>([])
  const [status, setStatus] = useState<RoomStatus>('connecting')
  const channel = useRef<RealtimeChannel | null>(null)
  // Ready is remembered for this tab and room, so a refresh in the lobby keeps it.
  const readyKey = `qg:ready:${game}:${code}`
  const self = useRef<Member>({ id: me, name: myName(), ready: readSession(readyKey) === '1', joinedAt: Date.now() })
  const handlers = useRef(new Map<string, Set<Handler>>())
  const tracked = useRef(false) // whether this player is in the room's presence
  const steppedOut = useRef(false) // left a running match (e.g. after a refresh) and waits for the next
  const [startedIds, setStartedIds] = useState<string[] | undefined>(undefined)
  const joined = useRef(false) // whether the channel has been subscribed

  useEffect(() => {
    if (!code) return
    setStatus('connecting')
    tracked.current = false
    joined.current = false
    const ch = realtime().channel(`room:${game}:${code}`, { config: { presence: { key: me }, broadcast: { self: false } } })
    channel.current = ch
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<Member>()
      const list = order(Object.values(state).map((metas) => metas[metas.length - 1] as unknown as Member))
      setMembers(list)
      const leave = (why: RoomStatus) => {
        setStatus(why)
        if (tracked.current) {
          tracked.current = false
          void ch.untrack()
        }
      }
      // Turned away while a match runs; let back in once the room reopens (rematch lobby).
      const started = list.find((m) => m.started)?.started
      setStartedIds(started)
      if (started && !started.includes(me)) return leave('started')
      // Stepped out of a match in progress (back in the lobby after a refresh): stay out until it ends.
      if (steppedOut.current) {
        if (started) return leave('started')
        steppedOut.current = false
      }
      if (!list.some((m) => m.id === me)) {
        if (!tracked.current && joined.current) {
          if (list.length < max) {
            tracked.current = true
            void ch.track(self.current)
          } else setStatus('full')
        }
        return
      }
      if (list.findIndex((m) => m.id === me) >= max) return leave('full')
      setStatus((s) => (s === 'error' ? s : 'open'))
    })
    ch.on('broadcast', { event: '*' }, ({ event, payload }) => {
      const { from, ...rest } = (payload ?? {}) as Record<string, unknown>
      handlers.current.get(event)?.forEach((h) => h(rest, String(from)))
    })
    ch.subscribe((s) => {
      if (s === 'SUBSCRIBED') {
        joined.current = true
        tracked.current = true
        void ch.track(self.current)
      }
      if (s === 'CHANNEL_ERROR' || s === 'TIMED_OUT') setStatus('error')
    })
    return () => {
      void ch.unsubscribe()
      channel.current = null
    }
  }, [game, code, me, max])

  const api = useMemo(
    () => ({
      /** Send an event to everyone else in the room. */
      send(event: string, payload: Record<string, unknown> = {}) {
        void channel.current?.send({ type: 'broadcast', event, payload: { ...payload, from: me } })
      },
      /** Listen for an event from others; returns an unsubscribe function. */
      on(event: string, h: Handler) {
        const set = handlers.current.get(event) ?? new Set()
        set.add(h)
        handlers.current.set(event, set)
        return () => set.delete(h)
      },
      /** Leave a match that is already running (this player refreshed and can't rejoin it); come back for the next. */
      stepOut() {
        steppedOut.current = true
        setStatus('started')
        if (tracked.current) {
          tracked.current = false
          void channel.current?.untrack()
        }
      },
      /** Update this player's presence (name, ready, started line-up). */
      update(patch: Partial<Member>) {
        const next = { ...self.current, ...patch }
        if (patch.ready !== undefined) writeSession(`qg:ready:${game}:${code}`, patch.ready ? '1' : null)
        // Skip updates that change nothing: quick back-to-back presence updates can leave other phones
        // with a stale view of the room.
        if (JSON.stringify(next) === JSON.stringify(self.current)) return
        self.current = next
        if (tracked.current) void channel.current?.track(self.current)
      },
    }),
    [me, game, code],
  )

  const host = members[0]?.id === me
  return { me, members, status, host, startedIds, ...api }
}

/**
 * For online games: if this player is in the lobby while their own room's match is running (they
 * refreshed mid-match), step out after a short grace period, so the others stop waiting for them.
 * The grace period lets a normal start (presence and the start message arriving a moment apart) go through.
 */
export function useStepOutIfStale(room: ReturnType<typeof useRoom>, inLobby: boolean) {
  const { startedIds, me, stepOut } = room
  useEffect(() => {
    if (!inLobby || !startedIds?.includes(me)) return
    const t = setTimeout(stepOut, 2000)
    return () => clearTimeout(t)
  }, [inLobby, startedIds, me, stepOut])
}
