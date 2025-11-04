import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * ThemeManager - Cambia automáticamente el tema según la ruta
 * 
 * Tema Claro (Cliente): /, /profile, /business/:id (details), /search, /auth, /reset-password
 * Tema Oscuro (Negocio): /dashboard, /business/:id/manage, /employee-portal, /waiter/:token
 */
export const ThemeManager = () => {
  const location = useLocation();

  useEffect(() => {
    const path = location.pathname;
    
    // Rutas que usan tema oscuro (negocio/gestión)
    const isDarkRoute = 
      path.startsWith('/dashboard') ||
      path.includes('/manage') ||
      path.startsWith('/employee-portal') ||
      path.startsWith('/waiter/');

    // Aplicar o remover la clase 'dark' del elemento raíz
    if (isDarkRoute) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [location.pathname]);

  return null; // Este componente no renderiza nada
};
