import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UsersPage from '@/pages/users-page';
import TagsPage from '@/pages/tags-page';
import PostsPage from '@/pages/posts/posts-page';
import NewPostPage from '@/pages/posts/new-post-page';
import HomePage from '@/pages/home-page.tsx';
import CategoriesPage from '@/pages/categories-page';
import AccountPage from '@/pages/account-page';
import AdminPanelLayout from '@/layouts/admin-panel-layout.tsx'
import { RootLayout } from '@/layouts/root-layout.tsx'

const App = () => {
  return (
    <RootLayout>
      <Router>
        <Routes>
          <Route path="/" element={
            <AdminPanelLayout>
              <HomePage />
            </AdminPanelLayout>
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
    </RootLayout>
  );
};

export default App;
