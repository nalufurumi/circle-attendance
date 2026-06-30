import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import AdminPage  from './pages/AdminPage.jsx'
import MemberPage from './pages/MemberPage.jsx'
import DevPage    from './pages/DevPage.jsx'
import ReportPage from './pages/ReportPage.jsx'
import DemoPage   from './pages/DemoPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin"  element={<AdminPage />} />
        <Route path="/member" element={<MemberPage />} />
        <Route path="/dev"    element={<DevPage />} />
        <Route path="/report" element={<ReportPage />} />
        <Route path="/demo"   element={<DemoPage />} />
        <Route path="*"       element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
