import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/LoginRegister.vue'),
  },
  {
    path: '/timeline',
    name: 'Timeline',
    component: () => import('../views/Timeline.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/memories/create',
    name: 'MemoryCreate',
    component: () => import('../views/MemoryCreate.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/memories/:id/edit',
    name: 'MemoryEdit',
    component: () => import('../views/MemoryEdit.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/memories/:id',
    name: 'MemoryDetail',
    component: () => import('../views/MemoryDetail.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('../views/Search.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/books',
    name: 'Books',
    component: () => import('../views/Books.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('../views/NotFound.vue'),
  },
  {
    path: '/share/:token',
    name: 'ShareView',
    component: () => import('../views/ShareView.vue'),
    meta: { requiresAuth: false }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  }
})

router.beforeEach((to) => {
  const token = localStorage.getItem('access_token')
  if (to.meta.requiresAuth && !token) {
    return { name: 'Login' }
  }
  if (to.name === 'Login' && token) {
    return { name: 'Timeline' }
  }
})

export default router