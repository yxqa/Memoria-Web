<template>
  <div class="app-shell">
    <div class="paper-texture"></div>

    <div class="center">

      <!-- 胶片框装饰 -->
      <div class="film-frame">
        <div class="film-perfs top">
          <div class="perf" v-for="n in 8" :key="'t'+n"></div>
        </div>

        <div class="frame-content">
          <div class="frame-number">404</div>
          <div class="frame-sub">FRAME NOT FOUND</div>
          <div class="lens">◎</div>
          <p class="frame-desc">这一帧记忆已经曝光过度<br />或者从未存在过</p>
        </div>

        <div class="film-perfs bottom">
          <div class="perf" v-for="n in 8" :key="'b'+n"></div>
        </div>
      </div>

      <!-- 操作按钮 -->
      <div class="actions">
        <button class="action-primary" @click="router.push('/timeline')">
          返回时间线
        </button>
        <button class="action-secondary" @click="router.go(-1)">
          上一页
        </button>
      </div>

    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Courier+Prime:wght@400;700&display=swap');

.app-shell {
  min-height: 100vh;
  background: #f5efe6;
  font-family: 'Courier Prime', monospace;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}

.paper-texture {
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none; z-index: 0; opacity: 0.6;
}

.center {
  display: flex; flex-direction: column; align-items: center;
  gap: 40px; position: relative; z-index: 1;
}

/* ── 胶片框 ── */
.film-frame {
  background: #2a1f0e;
  border-radius: 4px;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 8px 40px rgba(58,46,26,0.2);
  width: 340px;
}

.film-perfs {
  display: flex; justify-content: space-around; align-items: center;
  padding: 8px 12px; background: #1a1208;
}

.perf {
  width: 16px; height: 10px;
  border-radius: 2px; background: #2a1f0e;
  border: 1px solid #3a2e1a;
}

.frame-content {
  padding: 40px 32px;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  background: #221808;
}

.frame-number {
  font-family: 'Playfair Display', serif;
  font-size: 80px; font-weight: 700;
  color: #c4a882; letter-spacing: 8px; line-height: 1;
  text-shadow: 0 0 40px rgba(196,168,130,0.2);
  animation: flicker 4s ease-in-out infinite;
}

@keyframes flicker {
  0%,95%,100% { opacity: 1; }
  96% { opacity: 0.6; }
  97% { opacity: 1; }
  98% { opacity: 0.4; }
  99% { opacity: 1; }
}

.frame-sub {
  font-size: 10px; color: #5a4a2a;
  letter-spacing: 6px; text-transform: uppercase;
}

.lens {
  font-size: 36px; color: #5a4a2a;
  margin: 8px 0;
  animation: lens-rotate 8s linear infinite;
}

@keyframes lens-rotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

.frame-desc {
  font-size: 13px; color: #6b5a3a;
  text-align: center; line-height: 1.8;
  letter-spacing: 1px;
}

/* ── 按钮 ── */
.actions {
  display: flex; gap: 12px;
}

.action-primary {
  padding: 11px 28px;
  background: #8b6914; border: none; border-radius: 2px;
  color: #f5efe6; font-family: 'Courier Prime', monospace;
  font-size: 13px; letter-spacing: 2px; cursor: pointer;
  transition: all 0.2s;
}
.action-primary:hover { background: #6b5010; transform: translateY(-1px); }

.action-secondary {
  padding: 11px 28px;
  background: none; border: 1px solid #c4a87a; border-radius: 2px;
  color: #8b6914; font-family: 'Courier Prime', monospace;
  font-size: 13px; letter-spacing: 2px; cursor: pointer;
  transition: all 0.2s;
}
.action-secondary:hover { border-color: #8b6914; color: #3a2e1a; }
</style>