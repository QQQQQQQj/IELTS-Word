import { BrowserRouter, Route, Routes } from 'react-router-dom'
import FavoritesPage from '../features/collections/FavoritesPage'
import MasteredPage from '../features/collections/MasteredPage'
import MistakesPage from '../features/collections/MistakesPage'
import HomePage from '../features/home/HomePage'
import OnboardingPage from '../features/onboarding/OnboardingPage'
import SettingsPage from '../features/settings/SettingsPage'
import StatisticsPage from '../features/statistics/StatisticsPage'
import StudySessionPage from '../features/study/StudySessionPage'
import AppShell from '../shared/components/AppShell'
import AsyncState from '../shared/components/AsyncState'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="welcome" element={<OnboardingPage />} />
          <Route path="study/:kind" element={<StudySessionPage />} />
          <Route path="mistakes" element={<MistakesPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="mastered" element={<MasteredPage />} />
          <Route path="statistics" element={<StatisticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route
            path="*"
            element={<AsyncState status="empty" emptyText="页面不存在" />}
          />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
