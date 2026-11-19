import { dayNumber, seededRandom } from '../../shell/daily'

/** A number question: answers go from min to max in steps of `step`, shown with `unit`. */
export type Question = { prompt: string; min: number; max: number; step: number; unit: string }

// [prompt, min, max, step, unit]. Global, everyday, nothing personal or sensitive.
const WRITTEN: [string, number, number, number, string][] = [
  ['Pick a number from 1 to 100', 1, 100, 1, ''],
  ['Pick a number from 1 to 10', 1, 10, 1, ''],
  ['Pick a number from 0 to 1,000', 0, 1000, 10, ''],
  ['How many hours did you sleep last night?', 0, 12, 0.5, 'h'],
  ['How many tabs are open in your phone’s browser?', 0, 100, 1, 'tabs'],
  ['How many apps are on your phone’s home screen?', 0, 60, 1, 'apps'],
  ['How many unread emails do you have?', 0, 1000, 10, 'emails'],
  ['How many glasses of water have you had today?', 0, 12, 1, 'glasses'],
  ['How many cups of tea or coffee do you drink a day?', 0, 10, 1, 'cups'],
  ['How many minutes did your last shower take?', 0, 30, 1, 'min'],
  ['How many steps do you think you walked yesterday?', 0, 20000, 500, 'steps'],
  ['How many books did you read last year?', 0, 50, 1, 'books'],
  ['How many countries have you visited?', 0, 50, 1, 'countries'],
  ['How many pairs of shoes do you own?', 0, 30, 1, 'pairs'],
  ['How many pens or pencils are within reach right now?', 0, 20, 1, ''],
  ['How many plants are in your home?', 0, 30, 1, 'plants'],
  ['How many photos are on your phone?', 0, 20000, 500, 'photos'],
  ['How many times did you check your phone in the last hour?', 0, 40, 1, 'times'],
  ['What time do you usually wake up?', 4, 11, 0.5, 'am'],
  ['What time do you usually go to bed?', 20, 26, 0.5, 'h'],
  ['How many minutes is your usual trip to school or work?', 0, 120, 5, 'min'],
  ['How many songs did you listen to today?', 0, 50, 1, 'songs'],
  ['How many hours of screen time did you have yesterday?', 0, 16, 0.5, 'h'],
  ['How many friends could you call at 3 am?', 0, 15, 1, 'friends'],
  ['How spicy do you like your food, from 0 to 10?', 0, 10, 1, ''],
  ['How sweet do you like your tea or coffee, from 0 to 10?', 0, 10, 1, ''],
  ['How tidy is your room right now, from 0 to 10?', 0, 10, 1, ''],
  ['How hungry are you right now, from 0 to 10?', 0, 10, 1, ''],
  ['How sleepy are you right now, from 0 to 10?', 0, 10, 1, ''],
  ['How good are you at drawing, from 0 to 10?', 0, 10, 1, ''],
  ['How good a singer are you, from 0 to 10?', 0, 10, 1, ''],
  ['How good are you at remembering names, from 0 to 10?', 0, 10, 1, ''],
  ['How much do you like mornings, from 0 to 10?', 0, 10, 1, ''],
  ['How much do you like rain, from 0 to 10?', 0, 10, 1, ''],
  ['How much do you like surprises, from 0 to 10?', 0, 10, 1, ''],
  ['How patient are you in queues, from 0 to 10?', 0, 10, 1, ''],
  ['How brave are you with spiders, from 0 to 10?', 0, 10, 1, ''],
  ['How good is your sense of direction, from 0 to 10?', 0, 10, 1, ''],
  ['How loud is it where you are right now, from 0 to 10?', 0, 10, 1, ''],
  ['How warm is it where you are right now, in °C?', -20, 45, 1, '°C'],
  ['What’s the perfect room temperature, in °C?', 10, 30, 0.5, '°C'],
  ['What’s the perfect beach temperature, in °C?', 15, 45, 1, '°C'],
  ['At what temperature should a drink be “hot”, in °C?', 30, 100, 5, '°C'],
  ['How many seconds can you hold your breath?', 0, 120, 5, 's'],
  ['How many push-ups could you do right now?', 0, 100, 1, ''],
  ['How many seconds could you stand on one leg with your eyes closed?', 0, 120, 5, 's'],
  ['How many words a minute do you think you can type?', 0, 150, 5, 'wpm'],
  ['How many languages can you say “hello” in?', 0, 30, 1, ''],
  ['How many phone numbers do you know by heart?', 0, 20, 1, ''],
  ['How many passwords do you think you use?', 0, 100, 1, ''],
  ['How many hours a week do you spend cooking?', 0, 30, 1, 'h'],
  ['How many hours a week do you spend outdoors?', 0, 60, 1, 'h'],
  ['How many hours a week do you play games?', 0, 60, 1, 'h'],
  ['How many minutes a day do you spend reading?', 0, 180, 5, 'min'],
  ['How many minutes could you go without checking your phone?', 0, 600, 10, 'min'],
  ['How many slices of pizza make a perfect meal?', 1, 12, 1, 'slices'],
  ['How many scoops of ice cream is the right amount?', 1, 6, 1, 'scoops'],
  ['How many spoons of sugar is too much in a drink?', 0, 10, 1, 'spoons'],
  ['How many eggs could you eat in a day?', 0, 12, 1, 'eggs'],
  ['How many bananas would you trade for a pineapple?', 0, 20, 1, 'bananas'],
  ['How many ducks would you fight at once?', 0, 100, 1, 'ducks'],
  ['How many cats is the right number of cats?', 0, 10, 1, 'cats'],
  ['How many dogs is the right number of dogs?', 0, 10, 1, 'dogs'],
  ['How many hours is a perfect nap?', 0, 4, 0.25, 'h'],
  ['How many minutes early is “on time”?', 0, 30, 1, 'min'],
  ['How many minutes late is “late”?', 0, 60, 1, 'min'],
  ['How many seconds is a long hug?', 0, 30, 1, 's'],
  ['How many seconds is an awkward silence?', 0, 30, 1, 's'],
  ['How many days could you go without the internet?', 0, 60, 1, 'days'],
  ['How many days is the perfect holiday?', 1, 60, 1, 'days'],
  ['How many people is the perfect party?', 2, 100, 1, 'people'],
  ['How many people is the perfect dinner table?', 2, 20, 1, 'people'],
  ['How many hours is too long for a film?', 1, 5, 0.25, 'h'],
  ['How many minutes is the perfect song?', 1, 10, 0.5, 'min'],
  ['How many episodes before you give up on a show?', 1, 20, 1, 'episodes'],
  ['How many pages before you give up on a book?', 0, 200, 5, 'pages'],
  ['How many alarms do you set in the morning?', 0, 10, 1, 'alarms'],
  ['How many times do you press snooze?', 0, 10, 1, 'times'],
  ['How many minutes does it take you to get ready in the morning?', 0, 90, 5, 'min'],
  ['How many times a week do you eat breakfast?', 0, 7, 1, 'times'],
  ['How many meals a day is ideal?', 1, 6, 1, 'meals'],
  ['How many snacks a day is fine?', 0, 10, 1, 'snacks'],
  ['How many vegetables did you eat yesterday?', 0, 10, 1, 'portions'],
  ['How many hours a night do you think adults need?', 4, 12, 0.5, 'h'],
  ['How many birthdays do you remember without a reminder?', 0, 50, 1, ''],
  ['How old were you when you learned to ride a bike?', 0, 30, 1, 'years'],
  ['How old is “old”?', 30, 100, 1, 'years'],
  ['How old is “young”?', 5, 40, 1, 'years'],
  ['What age would you like to be forever?', 5, 80, 1, 'years'],
  ['How many years until robots do the dishes for everyone?', 0, 100, 1, 'years'],
  ['How many years until people live on Mars?', 0, 200, 5, 'years'],
  ['How many hours a day should school or work be?', 2, 12, 0.5, 'h'],
  ['How many days a week should the weekend be?', 1, 5, 1, 'days'],
  ['How many weeks of holiday a year is fair?', 0, 20, 1, 'weeks'],
  ['How many minutes is a good lunch break?', 10, 120, 5, 'min'],
  ['How many seconds should a traffic light stay red?', 10, 180, 5, 's'],
  ['How many floors before you take the lift instead of the stairs?', 1, 20, 1, 'floors'],
  ['How many minutes would you wait for a bus?', 0, 60, 1, 'min'],
  ['How many minutes would you queue for great food?', 0, 120, 5, 'min'],
  ['How many hours would you travel to see a friend?', 0, 24, 1, 'h'],
  ['How many kilometres is a long walk?', 1, 30, 1, 'km'],
  ['How many kilometres a day could you cycle?', 0, 200, 5, 'km'],
  ['How many stars out of 10 for today so far?', 0, 10, 1, ''],
  ['How many stars out of 10 for your last meal?', 0, 10, 1, ''],
  ['How many stars out of 10 for this week?', 0, 10, 1, ''],
  ['How many things are on your to-do list today?', 0, 30, 1, 'things'],
  ['How many things on that list will you actually do?', 0, 30, 1, 'things'],
  ['How many times did you laugh out loud yesterday?', 0, 50, 1, 'times'],
  ['How many messages did you send yesterday?', 0, 300, 5, 'messages'],
  ['How many photos did you take this week?', 0, 300, 5, 'photos'],
  ['How many group chats are you in?', 0, 50, 1, 'chats'],
  ['How many contacts are in your phone?', 0, 2000, 50, 'contacts'],
  ['How many keys are on your key ring?', 0, 15, 1, 'keys'],
  ['How many coins are in your pocket or bag right now?', 0, 30, 1, 'coins'],
  ['How many mugs are in your kitchen?', 0, 40, 1, 'mugs'],
  ['How many pillows do you sleep with?', 0, 6, 1, 'pillows'],
  ['How many blankets is cosy?', 0, 5, 1, 'blankets'],
  ['How many T-shirts do you own?', 0, 80, 1, 'T-shirts'],
  ['How many hats do you own?', 0, 20, 1, 'hats'],
  ['How many umbrellas have you lost in your life?', 0, 20, 1, 'umbrellas'],
  ['How many chargers do you own?', 0, 20, 1, 'chargers'],
  ['How many remote controls are in your home?', 0, 10, 1, 'remotes'],
  ['How many windows are in your home?', 0, 40, 1, 'windows'],
  ['How many stairs are there to your front door?', 0, 100, 1, 'stairs'],
]

/** All 365 questions in their yearly order (a fixed shuffle), the same for everyone. */
export const YEAR: Question[] = (() => {
  const r = seededRandom('guess-the-crowd:questions:v1')
  const out: Question[] = WRITTEN.map(([prompt, min, max, step, unit]) => ({ prompt, min, max, step, unit }))
  // Fill the year with "pick a number" ranges, each different.
  const tops = [5, 6, 7, 8, 9, 12, 15, 20, 25, 30, 40, 50, 60, 75, 99, 120, 150, 200, 250, 300, 365, 400, 500, 750, 999]
  const bottoms = [0, 1, 2, 5, 10]
  const seen = new Set(out.map((q) => q.prompt))
  for (const top of tops) for (const bottom of bottoms) {
    if (out.length >= 365 || bottom >= top / 2) continue
    const prompt = `Pick a number from ${bottom} to ${top}`
    if (seen.has(prompt)) continue
    seen.add(prompt)
    out.push({ prompt, min: bottom, max: top, step: top > 100 && (top - bottom) % 5 === 0 ? 5 : 1, unit: '' })
  }
  for (let k = 2; out.length < 365; k++) {
    const prompt = `Pick a number from 1 to ${k * 11}`
    if (seen.has(prompt)) continue
    seen.add(prompt)
    out.push({ prompt, min: 1, max: k * 11, step: 1, unit: '' })
  }
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
})()

export const WRITTEN_COUNT = WRITTEN.length

export function questionFor(d = new Date()): { id: number; q: Question } {
  const id = (((dayNumber(d) - 1) % 365) + 365) % 365
  return { id, q: YEAR[id] }
}

/** A value as a share of the question's range, 0..1 (what is stored). */
export const toShare = (q: Question, v: number) => (v - q.min) / (q.max - q.min)
export const fromShare = (q: Question, f: number) => q.min + f * (q.max - q.min)
/** How far a guess was from the crowd's average, in percent of the range, to 0.1. */
export const offBy = (q: Question, guess: number, meanShare: number) => Math.round(Math.abs(toShare(q, guess) - meanShare) * 1000) / 10
/** A value for display: rounded to the step, with the unit (times shown as clock times). */
export function show(q: Question, v: number): string {
  const r = Math.round(v / q.step) * q.step
  if (q.unit === 'am' || (q.unit === 'h' && q.min >= 20)) {
    const h = ((Math.floor(r) % 24) + 24) % 24, m = Math.round((r - Math.floor(r)) * 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }
  const n = Number.isInteger(r) ? r.toLocaleString('en') : r.toFixed(q.step < 0.5 ? 2 : 1)
  return q.unit ? `${n} ${q.unit}`.replace(/ (°C|h|s|min|km|wpm)$/, '$1').replace(/(\d)(h|s|min|km|wpm)$/, '$1 $2') : n
}
