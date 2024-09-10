import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import { AdminPanelLayout } from '@/layouts/admin-panel-layout.tsx'
import { RootLayout } from '@/layouts/root-layout.tsx'
import { HomePage } from '@/pages/home-page.tsx';
import { UsersPage } from '@/pages/users-page.tsx';
import { TagsPage } from '@/pages/tags-page.tsx';
import { PostsPage } from '@/pages/posts/posts-page.tsx';
import { NewPostPage } from '@/pages/posts/new-post-page.tsx';
import { CategoriesPage } from '@/pages/categories-page.tsx';
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
          <Route path="/users" element={
            <AdminPanelLayout>
              <UsersPage/>
            </AdminPanelLayout>
          }/>
          <Route path="/tags" element={
            <AdminPanelLayout>
              <TagsPage/>
            </AdminPanelLayout>
          }/>
          <Route path="/posts" element={
            <AdminPanelLayout>
              <PostsPage/>
            </AdminPanelLayout>
          }/>
          <Route path="/posts/new" element={
            <AdminPanelLayout>
              <NewPostPage/>
            </AdminPanelLayout>
          }/>
          <Route path="/categories" element={
            <AdminPanelLayout>
              <CategoriesPage/>
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
