/** "1 mirror", "2 mirrors": a number with its noun, singular for exactly one. */
export const count = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`
