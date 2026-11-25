import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router'
import { BoardCanvas } from '@/features/board/BoardCanvas'

function BoardRoute() {
  const { boardId } = useParams()
  if (!boardId) return <Navigate to="/" replace />
  return <BoardCanvas boardId={boardId} />
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/b/:boardId" element={<BoardRoute />} />
        <Route path="*" element={<Navigate to="/b/local-dev-board" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
