import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Layout from './components/layout/Layout';

import Login      from './pages/Login/Login';
import Venta      from './pages/Venta/Venta';
import Historial  from './pages/Historial/Historial';
import Productos  from './pages/Productos/Productos';
import Categorias from './pages/Categorias/Categorias';
import Descuentos from './pages/Descuentos/Descuentos';
import Compras    from './pages/Compras/Compras';
import Proveedores from './pages/Proveedores/Proveedores';
import Clientes   from './pages/Clientes/Clientes';
import Faltantes  from './pages/Faltantes/Faltantes';
import Reportes   from './pages/Reportes/Reportes';

import './styles/global.css';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route path="/" element={<Navigate to="/venta" replace />} />

          <Route path="/venta" element={
            <PrivateRoute>
              <Layout><Venta /></Layout>
            </PrivateRoute>
          } />

          <Route path="/historial" element={
            <PrivateRoute>
              <Layout><Historial /></Layout>
            </PrivateRoute>
          } />

          <Route path="/productos" element={
            <PrivateRoute>
              <Layout><Productos /></Layout>
            </PrivateRoute>
          } />

          <Route path="/categorias" element={
            <PrivateRoute role="ADMIN">
              <Layout><Categorias /></Layout>
            </PrivateRoute>
          } />

          <Route path="/descuentos" element={
            <PrivateRoute role="ADMIN">
              <Layout><Descuentos /></Layout>
            </PrivateRoute>
          } />

          <Route path="/compras" element={
            <PrivateRoute role="ADMIN">
              <Layout><Compras /></Layout>
            </PrivateRoute>
          } />

          <Route path="/proveedores" element={
            <PrivateRoute role="ADMIN">
              <Layout><Proveedores /></Layout>
            </PrivateRoute>
          } />

          <Route path="/clientes" element={
            <PrivateRoute>
              <Layout><Clientes /></Layout>
            </PrivateRoute>
          } />

          <Route path="/faltantes" element={
            <PrivateRoute>
              <Layout><Faltantes /></Layout>
            </PrivateRoute>
          } />

          <Route path="/reportes" element={
            <PrivateRoute role="ADMIN">
              <Layout><Reportes /></Layout>
            </PrivateRoute>
          } />

          <Route path="*" element={<Navigate to="/venta" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;