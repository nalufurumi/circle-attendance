import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminPage  from './pages/AdminPage.jsx'
import MemberPage from './pages/MemberPage.jsx'
import DevPage    from './pages/DevPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin"  element={<AdminPage />} />
        <Route path="/member" element={<MemberPage />} />
        <Route path="/dev"    element={<DevPage />} />
        <Route path="*"       element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
