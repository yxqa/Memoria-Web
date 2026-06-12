<template>
  <div class="app-shell">
    <div class="center" v-motion :initial="{ opacity: 0, scale: 0.95 }" :enter="{ opacity: 1, scale: 1, transition: { duration: 500 } }">
      <div class="error-code">404</div>
      <div class="error-divider"></div>
      <h1 class="error-title">页面未找到</h1>
      <p class="error-desc">这一页记忆已经消散，或者从未存在过</p>
      <div class="actions">
        <button class="action-primary" @click="router.push('/timeline')">返回时间线</button>
        <button class="action-secondary" @click="router.go(-1)">上一页</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
.app-shell { min-height: 100vh; background: var(--color-bg); display: flex; align-items: center; justify-content: center; font-family: var(--font-body); }
.center { display: flex; flex-direction: column; align-items: center; gap: 20px; }
.error-code { font-family: var(--font-display); font-size: 96px; font-weight: 700; color: var(--color-accent); line-height: 1; opacity: 0.6; }
.error-divider { width: 60px; height: 2px; background: var(--color-border); border-radius: 1px; }
.error-title { font-family: var(--font-display); font-size: 24px; font-weight: 500; color: var(--color-ink); font-style: italic; }
.error-desc { font-size: 14px; color: var(--color-ink-muted); }
.actions { display: flex; gap: 12px; margin-top: 12px; }
.action-primary { padding: 12px 28px; background: var(--color-accent-deep); border: none; border-radius: var(--radius-sm); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.25s; }
.action-primary:hover { background: #7a5555; transform: translateY(-1px); }
.action-secondary { padding: 12px 28px; background: none; border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-ink-muted); font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.25s; }
.action-secondary:hover { border-color: var(--color-accent); color: var(--color-ink); }
</style>