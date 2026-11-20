import { describe, expect, it } from 'vitest'
import first from '../../supabase/migrations/20261119170000_daily_boards.sql?raw'
import added from '../../supabase/migrations/20261119180000_daily_boards_new_games.sql?raw'
import partJ from '../../supabase/migrations/20261120140000_new_games_j.sql?raw'
import hidden from '../../supabase/migrations/20261120160000_hidden_word.sql?raw'
import { LISTED } from '../games/registry'
import { BOARD_GAMES } from './board'

describe('daily boards', () => {
  it('lists exactly the games the database accepts', () => {
    const rules = first.slice(first.indexOf('insert into app.board_rules'), first.indexOf('create table app.scores')) + added + partJ + hidden
    const inDb = [...rules.matchAll(/\('([a-z-]+)', (true|false)/g)].map((m) => m[1]).sort()
    expect([...BOARD_GAMES].sort()).toEqual(inDb)
  })
  it('only has boards for listed daily games', () => {
    for (const g of BOARD_GAMES) expect(LISTED.find((x) => x.slug === g)?.daily).toBe(true)
  })
})
