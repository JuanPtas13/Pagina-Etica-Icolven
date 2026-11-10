import { Route, Routes } from 'react-router-dom';
import { isSupabaseConfigured } from './lib/supabase';
import { PublicLayout } from './components/layout/PublicLayout';
import { AdminLayout } from './components/layout/AdminLayout';
import { RedirectIfAuthenticated, RequireTeacher } from './components/layout/Guards';
import { HomePage } from './pages/Home/HomePage';
import { ProjectsPage } from './pages/Projects/ProjectsPage';
import { ProjectDetailPage } from './pages/Projects/ProjectDetailPage';
import { PostsPage } from './pages/Posts/PostsPage';
import { PostDetailPage } from './pages/Posts/PostDetailPage';
import { LoginPage } from './pages/Auth/LoginPage';
import { RegisterPage } from './pages/Auth/RegisterPage';
import { AuthCallbackPage, ForgotPasswordPage, ResetPasswordPage } from './pages/Auth/RecoveryPages';
import { NotFoundPage } from './pages/NotFound/NotFoundPage';
import { AboutPage } from './pages/About/AboutPage';
import { DashboardPage } from './pages/Admin/DashboardPage';
import { ProjectsAdminPage } from './pages/Admin/ProjectsAdminPage';
import { PostsAdminPage } from './pages/Admin/PostsAdminPage';
import { PostEditorPage } from './pages/Admin/PostEditorPage';
import { CategoriesAdminPage } from './pages/Admin/CategoriesAdminPage';
import { CommentsAdminPage } from './pages/Admin/CommentsAdminPage';
import { UsersAdminPage } from './pages/Admin/UsersAdminPage';

function MissingConfig() {
  return (
    <div className="container page">
      <div className="state state--error" role="alert">
        <h1 className="section-title">Falta configurar Supabase</h1>
        <p>
          Copia <code>.env.example</code> a <code>.env</code> y completa <code>VITE_SUPABASE_URL</code> y{' '}
          <code>VITE_SUPABASE_ANON_KEY</code> (clave pública «anon»). Luego reinicia el servidor de desarrollo.
        </p>
      </div>
    </div>
  );
}

export default function App() {
  if (!isSupabaseConfigured) return <MissingConfig />;

  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<HomePage />} />
        <Route path="proyectos" element={<ProjectsPage area="all" />} />
        <Route path="proyectos/:slug" element={<ProjectDetailPage />} />
        <Route path="etica" element={<ProjectsPage area="etica" />} />
        <Route path="filosofia" element={<ProjectsPage area="filosofia" />} />
        <Route path="gabinete" element={<ProjectsPage area="gabinete" />} />
        <Route path="acerca-de" element={<AboutPage />} />
        <Route path="publicaciones" element={<PostsPage />} />
        <Route path="publicaciones/:id" element={<PostDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>

      {/* Autenticación (pantalla completa, sin cabecera pública) */}
      <Route path="iniciar-sesion" element={<RedirectIfAuthenticated><LoginPage /></RedirectIfAuthenticated>} />
      <Route path="registro" element={<RedirectIfAuthenticated><RegisterPage /></RedirectIfAuthenticated>} />
      <Route path="recuperar" element={<ForgotPasswordPage />} />
      <Route path="restablecer" element={<ResetPasswordPage />} />
      <Route path="auth/callback" element={<AuthCallbackPage />} />

      {/* Panel del profesor: la guardia es solo comodidad; RLS protege los datos */}
      <Route path="admin" element={<RequireTeacher><AdminLayout /></RequireTeacher>}>
        <Route index element={<DashboardPage />} />
        <Route path="proyectos" element={<ProjectsAdminPage />} />
        <Route path="publicaciones" element={<PostsAdminPage />} />
        <Route path="publicaciones/nueva" element={<PostEditorPage />} />
        <Route path="publicaciones/:id" element={<PostEditorPage />} />
        <Route path="categorias" element={<CategoriesAdminPage />} />
        <Route path="comentarios" element={<CommentsAdminPage />} />
        <Route path="usuarios" element={<UsersAdminPage />} />
      </Route>
    </Routes>
  );
}
