import { describe, expect, it } from 'vitest'
import { safeNext } from './safeNext'

describe('safeNext', () => {
  it('garde un chemin interne', () => expect(safeNext('/b/abc')).toBe('/b/abc'))
  it('refuse les URL absolues et protocol-relative', () => {
    expect(safeNext('https://evil.com')).toBe('/')
    expect(safeNext('//evil.com')).toBe('/')
    expect(safeNext('/\\evil.com')).toBe('/')
    expect(safeNext(null)).toBe('/')
  })
})
