/** Human-readable interval between now and a due timestamp. */
export function formatInterval(now: number, dueAt: number): string {
  const deltaMs = Math.max(0, dueAt - now)
  const minutes = Math.round(deltaMs / 60_000)
  if (minutes < 1) {
    return '不到 1 分钟'
  }
  if (minutes < 60) {
    return `${minutes} 分钟`
  }
  const hours = Math.round(minutes / 60)
  if (hours < 24) {
    return `${hours} 小时`
  }
  const days = Math.round(hours / 24)
  return `${days} 天`
}
