export function useAuth() {
  const isAuthenticated = !!sessionStorage.getItem('access_token');

  const logout = () => {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
    window.location.href = '/login';
  };

  return { isAuthenticated, logout };
}
