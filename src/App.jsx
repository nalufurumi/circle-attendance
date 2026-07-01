import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import ErrorBoundary from './components/ErrorBoundary.jsx'

// 初回表示に必要なページは静的import
import AdminPage    from './pages/AdminPage.jsx'
import MemberPage   from './pages/MemberPage.jsx'
import LandingPage  from './pages/LandingPage.jsx'

// 使用頻度の低いページは遅延ロード（メインバンドルから分離）
const DevPage    = lazy(() => import('./pages/DevPage.jsx'))
const ReportPage = lazy(() => import('./pages/ReportPage.jsx'))
const DemoPage   = lazy(() => import('./pages/DemoPage.jsx'))
const SlidesPage = lazy(() => import('./pages/SlidesPage.jsx'))

const Loading = () => (
  <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-sans)', fontSize: 14 }}>
    読み込み中...
  </div>
)

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/admin"  element={<AdminPage />} />
            <Route path="/member" element={<MemberPage />} />
            <Route path="/dev"    element={<DevPage />} />
            <Route path="/report" element={<ReportPage />} />
            <Route path="/demo"   element={<DemoPage />} />
            <Route path="/lp"     element={<LandingPage />} />
            <Route path="/slides" element={<SlidesPage />} />
            <Route path="*"       element={<Navigate to="/lp" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  )
}
