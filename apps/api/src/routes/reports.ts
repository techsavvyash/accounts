import { Elysia } from 'elysia'

export const reportRoutes = new Elysia({ prefix: '/reports' })
  .get('/', () => ({ message: 'Reports route - To be implemented' }))