import { Navigate, Outlet } from 'react-router-dom';
import { useAppSelector } from '../hooks/useRedux';
import Layout from '../layouts/Layout';

export default function PrivateRoute() {
  const { token } = useAppSelector((s) => s.auth);
  if (!token) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Outlet />
    </Layout>
  );
}
