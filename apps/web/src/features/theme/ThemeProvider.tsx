import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { readStoredTheme, resolveTheme, storeTheme, type Theme } from './theme'

interface ThemeContextValue {
  readonly theme: Theme
  readonly resolved: 'light' | 'dark'
  setTheme(theme: Theme): void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function usePrefersDark(): boolean {
  const query = '(prefers-color-scheme: dark)'
  const [dark, setDark] = useState(() => window.matchMedia?.(query).matches ?? false)
  useEffect(() => {
    const mql = window.matchMedia?.(query)
    if (!mql) return
    const onChange = (e: MediaQueryListEvent) => setDark(e.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [])
  return dark
}

export function ThemeProvider({ children }: { readonly children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readStoredTheme)
  const prefersDark = usePrefersDark()
  const resolved = resolveTheme(theme, prefersDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolved === 'dark')
  }, [resolved])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      resolved,
      setTheme: (t) => {
        storeTheme(t)
        setThemeState(t)
      },
    }),
    [theme, resolved],
  )
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme doit être utilisé dans <ThemeProvider>')
  return ctx
}
