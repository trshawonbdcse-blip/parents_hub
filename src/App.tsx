import { useEffect } from 'react'
import { HashRouter, Route, Routes, useLocation } from 'react-router-dom'
import { BottomNav } from './components/BottomNav'
import { Events } from './pages/Events'
import { Explore } from './pages/Explore'
import { Family } from './pages/Family'
import { PlaceDetail } from './pages/PlaceDetail'
import { Saved } from './pages/Saved'
import { Today } from './pages/Today'

// Place pages have their own bottom action bar, so the tab bar is hidden there.
function Nav() {
  const { pathname } = useLocation()
  return pathname.startsWith('/place/') ? null : <BottomNav />
}

function ScrollToTop() {
  const { pathname } = useLocation()
  // Block body on purpose: some browser extensions make scrollTo return a value,
  // which React would then try to call as the effect's cleanup.
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

// HashRouter keeps the app working on any static host (e.g. GitHub Pages) without server rewrites.
export default function App() {
  return (
    <HashRouter>
      <ScrollToTop />
      <main className="app">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/place/:id" element={<PlaceDetail />} />
          <Route path="/events" element={<Events />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/me" element={<Family />} />
          <Route path="*" element={<Today />} />
        </Routes>
      </main>
      <Nav />
    </HashRouter>
  )
}
