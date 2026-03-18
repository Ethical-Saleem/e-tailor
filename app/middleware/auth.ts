// app/middleware/auth.ts
export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()

  // Public routes that don't need auth
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/confirm', '/auth/reset-password']
  if (publicRoutes.includes(to.path)) return

  // If not authenticated, redirect to login
  if (!user.value) {
    return navigateTo('/auth/login')
  }
})
