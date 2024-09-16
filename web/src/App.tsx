import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { AdminPanelLayout } from '@/layouts/admin-panel-layout.tsx'
import { RootLayout } from '@/layouts/root-layout.tsx'
import { HomePage } from '@/pages/home-page.tsx';
import { AccountPage } from '@/pages/account-page.tsx';

const App = () => {
  return (
    <RootLayout>
      <Router>
        <Routes>
          <Route path="/" element={
            <AdminPanelLayout hideFooter={true}>
              <HomePage/>
            </AdminPanelLayout>
          }/>
          <Route path="/image/:id" element={
            <AdminPanelLayout hideFooter={true}>
              <HomePage/>
            </AdminPanelLayout>
          }/>
          <Route path="/account" element={
            <AdminPanelLayout>
              <AccountPage/>
            </AdminPanelLayout>
          }/>
        </Routes>
      </Router>
    </RootLayout>
  )
}

export default App
