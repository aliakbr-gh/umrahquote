import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/visas',
    },
    {
      path: '/visas',
      name: 'visas',
      component: HomeView,
    },
    {
      path: '/hotels',
      name: 'hotels',
      component: () => import('../views/HotelView.vue'),
    },
  ],
})

export default router
