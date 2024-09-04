import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UsersPage from '@/pages/users-page';
import TagsPage from '@/pages/tags-page';
import PostsPage from '@/pages/posts/posts-page';
import NewPostPage from '@/pages/posts/new-post-page';
import DashboardPage from '@/pages/dashboard-page';
import CategoriesPage from '@/pages/categories-page';
import AccountPage from '@/pages/account-page';
import HomePage from '@/pages/home-page.tsx'
import AdminPanelLayout from '@/layouts/admin-panel-layout.tsx'
import { ThemeProvider } from './providers/theme-provider';

const App = () => {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem={true}>
      <Router>
        <Routes>
          <Route path="/" element={
            <HomePage />
          } />
          <Route path="/users" element={
            <AdminPanelLayout>
              <UsersPage />
            </AdminPanelLayout>
          }/>
          <Route path="/tags" element={
            <AdminPanelLayout>
              <TagsPage />
            </AdminPanelLayout>
          }/>
          <Route path="/posts" element={
            <AdminPanelLayout>
              <PostsPage />
            </AdminPanelLayout>
          }/>
          <Route path="/posts/new" element={
            <AdminPanelLayout>
              <NewPostPage />
            </AdminPanelLayout>
          }/>
          <Route path="/dashboard" element={
            <AdminPanelLayout>
              <DashboardPage />
            </AdminPanelLayout>
          }/>
          <Route path="/categories" element={
            <AdminPanelLayout>
              <CategoriesPage />
            </AdminPanelLayout>
          }/>
          <Route path="/account" element={
            <AdminPanelLayout>
              <AccountPage />
            </AdminPanelLayout>
          }/>
        </Routes>
      </Router>
    </ThemeProvider>
  );
};

export default App;
