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
  const self = useRef<Member>({ id: me, name: myName(), ready: false, joinedAt: Date.now() })
  const handlers = useRef(new Map<string, Set<Handler>>())

  useEffect(() => {
    if (!code) return
    setStatus('connecting')
    const ch = realtime().channel(`room:${game}:${code}`, { config: { presence: { key: me }, broadcast: { self: false } } })
    channel.current = ch
    ch.on('presence', { event: 'sync' }, () => {
      const state = ch.presenceState<Member>()
      const list = order(Object.values(state).map((metas) => metas[metas.length - 1] as unknown as Member))
      setMembers(list)
      const started = list.find((m) => m.started)?.started
      if (started && !started.includes(me)) {
        setStatus('started')
        void ch.untrack()
        return
      }
      const rank = list.findIndex((m) => m.id === me)
      if (rank >= max) {
        setStatus('full')
        void ch.untrack()
        return
      }
      setStatus((s) => (s === 'connecting' && rank >= 0 ? 'open' : s))
    })
    ch.on('broadcast', { event: '*' }, ({ event, payload }) => {
      const { from, ...rest } = (payload ?? {}) as Record<string, unknown>
      handlers.current.get(event)?.forEach((h) => h(rest, String(from)))
    })
    ch.subscribe((s) => {
      if (s === 'SUBSCRIBED') void ch.track(self.current)
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
      /** Update this player's presence (name, ready, started line-up). */
      update(patch: Partial<Member>) {
        self.current = { ...self.current, ...patch }
        void channel.current?.track(self.current)
      },
    }),
    [me],
  )

  const host = members[0]?.id === me
  return { me, members, status, host, ...api }
}
