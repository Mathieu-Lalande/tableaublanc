import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { Toaster } from 'sonner'
import { LoginPage } from '@/features/auth/LoginPage'
import { RegisterPage } from '@/features/auth/RegisterPage'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { InvitePage } from '@/features/invite/InvitePage'
import { FullPageSpinner } from '@/components/ui/spinner'
import { ThemeProvider, useTheme } from '@/features/theme/ThemeProvider'

// tldraw est lourd : chargé seulement à l'ouverture d'un board.
const BoardPage = lazy(() =>
  import('@/features/board/BoardPage').then((m) => ({ default: m.BoardPage })),
)

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: true } },
})

function ThemedToaster() {
  const { resolved } = useTheme()
  return <Toaster theme={resolved} position="bottom-center" richColors />
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route
              path="/"
              element={
                <RequireAuth>
                  <DashboardPage />
                </RequireAuth>
              }
            />
            <Route
              path="/b/:boardId"
              element={
                <RequireAuth>
                  <Suspense fallback={<FullPageSpinner />}>
                    <BoardPage />
                  </Suspense>
                </RequireAuth>
              }
            />
            <Route
              path="/invite/:token"
              element={
                <RequireAuth>
                  <InvitePage />
                </RequireAuth>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        <ThemedToaster />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
