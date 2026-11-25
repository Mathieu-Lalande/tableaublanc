import { describe, expect, it } from 'vitest'
import { resolveTheme } from './theme'

describe('resolveTheme', () => {
  it('suit le système en mode system', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
  })
  it('respecte un choix explicite', () => {
    expect(resolveTheme('light', true)).toBe('light')
  })
})
