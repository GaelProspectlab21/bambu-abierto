export function elapsedSeconds(start: number, end: number): number {
  return Math.max(0, Math.round((end - start) / 1000))
}
export function timerCues(previous: number, current: number, minimum: number, target: number): string[] {
  const cues: string[] = []
  if (previous < minimum && current >= minimum) cues.push('minimum')
  if (previous < target && current >= target && target !== minimum) cues.push('target')
  return cues
}
