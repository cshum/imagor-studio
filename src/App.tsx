import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UsersPage from '@/pages/users-page';
import TagsPage from '@/pages/tags-page';
import PostsPage from '@/pages/posts/posts-page';
import NewPostPage from '@/pages/posts/new-post-page';
import DashboardPage from '@/pages/dashboard-page';
import CategoriesPage from '@/pages/categories-page';
import AccountPage from '@/pages/account-page';
import RootLayout from '@/layouts/root-layout';
import DemoLayout from '@/layouts/demo-layout';
import HomePage from '@/pages/home-page.tsx'

const App = () => {
  return (
    <Router>
      <RootLayout>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/users" element={
            <DemoLayout>
              <UsersPage />
            </DemoLayout>
          }/>
          <Route path="/tags" element={
            <DemoLayout>
              <TagsPage />
            </DemoLayout>
          }/>
          <Route path="/posts" element={
            <DemoLayout>
              <PostsPage />
            </DemoLayout>
          }/>
          <Route path="/posts/new" element={
            <DemoLayout>
              <NewPostPage />
            </DemoLayout>
          }/>
          <Route path="/dashboard" element={
            <DemoLayout>
              <DashboardPage />
            </DemoLayout>
          }/>
          <Route path="/categories" element={
            <DemoLayout>
              <CategoriesPage />
            </DemoLayout>
          }/>
          <Route path="/account" element={
            <DemoLayout>
              <AccountPage />
            </DemoLayout>
          }/>
        </Routes>
      </RootLayout>
    </Router>
  );
};

export default App;
