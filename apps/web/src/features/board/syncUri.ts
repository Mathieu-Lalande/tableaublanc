/** URI WebSocket du sync, sur la même origine que la page (proxy Vite en dev, Caddy en prod). */
export function buildSyncUri(
  boardId: string,
  location: Pick<Location, 'protocol' | 'host'>,
): string {
  const scheme = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${scheme}//${location.host}/api/sync/${encodeURIComponent(boardId)}`
}
