import AppLayout from '../layouts/AppLayout.jsx';
import HomePage from '../pages/HomePage.jsx';
import StudentDashboard from '../pages/student/StudentDashboard.jsx';
import AdminDashboard from '../pages/admin/AdminDashboard.jsx';
import NotFoundPage from '../pages/NotFoundPage.jsx';
export const routes = [
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/student/dashboard', element: <StudentDashboard /> },
      { path: '/admin/dashboard', element: <AdminDashboard /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
];
