import AppLayout from '../layouts/AppLayout.jsx';
import HomePage from '../pages/HomePage.jsx';
import StudentDashboard from '../pages/student/StudentDashboard.jsx';
import AdminDashboard from '../pages/admin/AdminDashboard.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
import AuthProvider from '../context/AuthProvider.jsx';
import AuthPage from '../pages/auth/AuthPage.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';
import WorkspaceLayout from '../layouts/WorkspaceLayout.jsx';
import CompaniesPage from '../pages/shared/CompaniesPage.jsx';
import CompanyPage from '../pages/shared/CompanyPage.jsx';
import DrivesPage from '../pages/shared/DrivesPage.jsx';
import DrivePage from '../pages/shared/DrivePage.jsx';
import ApplicationsPage from '../pages/shared/ApplicationsPage.jsx';
import ApplicationDetailPage from '../pages/shared/ApplicationDetailPage.jsx';
import AnnouncementsPage from '../pages/shared/AnnouncementsPage.jsx';
import ProfilePage from '../pages/student/ProfilePage.jsx';
import CatalogEditor from '../pages/admin/CatalogEditor.jsx';
import RecruitmentEditor from '../pages/admin/RecruitmentEditor.jsx';
const shared = (role) => [
  { path: `/${role}/companies`, element: <CompaniesPage /> },
  { path: `/${role}/companies/:id`, element: <CompanyPage /> },
  { path: `/${role}/drives`, element: <DrivesPage /> },
  { path: `/${role}/drives/:id`, element: <DrivePage /> },
  { path: `/${role}/applications`, element: <ApplicationsPage /> },
  { path: `/${role}/applications/:id`, element: <ApplicationDetailPage /> },
  { path: `/${role}/announcements`, element: <AnnouncementsPage /> },
];
export const routes = [
  {
    element: <AuthProvider />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <HomePage /> },
          { path: '/login', element: <AuthPage key="login" /> },
          { path: '/register', element: <AuthPage key="register" register /> },
          {
            element: <ProtectedRoute role="student" />,
            children: [
              {
                element: <WorkspaceLayout role="student" />,
                children: [
                  { path: '/student/dashboard', element: <StudentDashboard /> },
                  { path: '/student/profile', element: <ProfilePage /> },
                  ...shared('student'),
                  {
                    path: '/student/drives/:id/timeline',
                    element: <DrivePage />,
                  },
                ],
              },
            ],
          },
          {
            element: <ProtectedRoute role="admin" />,
            children: [
              {
                element: <WorkspaceLayout role="admin" />,
                children: [
                  { path: '/admin/dashboard', element: <AdminDashboard /> },
                  ...shared('admin'),
                  {
                    path: '/admin/companies/new',
                    element: <CatalogEditor kind="company" create />,
                  },
                  {
                    path: '/admin/companies/:id/edit',
                    element: <CatalogEditor kind="company" />,
                  },
                  {
                    path: '/admin/companies/:id/job-postings/new',
                    element: <CatalogEditor kind="posting" create />,
                  },
                  {
                    path: '/admin/job-postings/:id/edit',
                    element: <CatalogEditor kind="posting" />,
                  },
                  {
                    path: '/admin/drives/new',
                    element: <CatalogEditor kind="drive" create />,
                  },
                  {
                    path: '/admin/drives/:id/edit',
                    element: <CatalogEditor kind="drive" />,
                  },
                  {
                    path: '/admin/drives/:id/rounds',
                    element: <RecruitmentEditor />,
                  },
                  {
                    path: '/admin/drives/:id/schedule',
                    element: <RecruitmentEditor />,
                  },
                ],
              },
            ],
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
];
