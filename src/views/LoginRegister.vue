<template>
  <div class="shell">
    <div class="paper-texture"></div>

    <!-- 胶片边框装饰 -->
    <div class="film-strip left">
      <div v-for="n in 12" :key="n" class="perforation"></div>
    </div>
    <div class="film-strip right">
      <div v-for="n in 12" :key="n" class="perforation"></div>
    </div>

    <div class="stage">
      <!-- Logo区 -->
      <div class="brand">
        <div class="lens-ring">
          <div class="lens-inner">
            <span class="lens-icon">◎</span>
          </div>
        </div>
        <h1 class="brand-name">Memoria</h1>
        <p class="brand-sub">私人多媒体记忆库</p>
      </div>

      <!-- 卡片 -->
      <div class="card">
        <!-- Tab切换 -->
        <div class="tabs">
          <button
            class="tab"
            :class="{ active: mode === 'login' }"
            @click="switchMode('login')"
          >登录</button>
          <button
            class="tab"
            :class="{ active: mode === 'register' }"
            @click="switchMode('register')"
          >注册</button>
          <div class="tab-ink" :style="inkStyle"></div>
        </div>

        <!-- 表单 -->
        <form class="form" @submit.prevent="handleSubmit">
          <div class="field">
            <label class="label">用户名</label>
            <div class="input-wrap">
              <span class="input-icon">⌬</span>
              <input
                v-model="form.username"
                class="input"
                type="text"
                placeholder="3~50个字符"
                autocomplete="username"
              />
            </div>
          </div>

          <div class="field">
            <label class="label">密码</label>
            <div class="input-wrap">
              <span class="input-icon">◈</span>
              <input
                v-model="form.password"
                class="input"
                :type="showPwd ? 'text' : 'password'"
                placeholder="8位以上"
                autocomplete="current-password"
              />
              <button type="button" class="eye-btn" @click="showPwd = !showPwd">
                {{ showPwd ? '◐' : '◑' }}
              </button>
            </div>
          </div>

          <!-- 错误提示 -->
          <transition name="shake">
            <p v-if="errorMsg" class="error-msg">{{ errorMsg }}</p>
          </transition>

          <button class="submit-btn" type="submit" :disabled="loading">
            <span v-if="!loading" class="btn-text">
              {{ mode === 'login' ? '冲印记忆' : '开始记录' }}
            </span>
            <span v-else class="btn-loading">
              <span class="dot" v-for="n in 3" :key="n"></span>
            </span>
          </button>
        </form>

        <!-- 底部切换提示 -->
        <p class="switch-hint">
          {{ mode === 'login' ? '还没有账号？' : '已有账号？' }}
          <a class="switch-link" @click="switchMode(mode === 'login' ? 'register' : 'login')">
            {{ mode === 'login' ? '立即注册' : '返回登录' }}
          </a>
        </p>
      </div>

      <!-- 底部胶片编号 -->
      <p class="film-code">MEMORIA-400 ☰ 36exp ☰ ISO 400</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()

const mode = ref('login')
const showPwd = ref(false)
const loading = ref(false)
const errorMsg = ref('')

const form = ref({ username: '', password: '' })

const inkStyle = computed(() => ({
  transform: mode.value === 'login' ? 'translateX(0)' : 'translateX(100%)',
}))

function switchMode(m) {
  mode.value = m
  errorMsg.value = ''
  form.value = { username: '', password: '' }
}

async function handleSubmit() {
  errorMsg.value = ''
  if (!form.value.username || !form.value.password) {
    errorMsg.value = '请填写用户名和密码'
    return
  }
  if (form.value.password.length < 6) {
    errorMsg.value = '密码至少6位'
    return
  }

  loading.value = true
  try {
    const url = mode.value === 'login'
      ? '/api/v1/auth/login'
      : '/api/v1/auth/register'

    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form.value),
    })
    const data = await resp.json()

    if (!resp.ok) {
      errorMsg.value = data.detail || '操作失败，请重试'
      return
    }

    if (mode.value === 'login') {
      localStorage.setItem('access_token', data.access_token)
      router.push('/timeline')
    } else {
      errorMsg.value = ''
      alert('注册成功，请登录')
      switchMode('login')
    }
  } catch (e) {
    errorMsg.value = '网络异常，请检查连接'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Courier+Prime:ital,wght@0,400;0,700;1,400&display=swap');

.shell {
  min-height: 100vh;
  background: #f0e8d8;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  font-family: 'Courier Prime', monospace;
}

.paper-texture {
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
  pointer-events: none; z-index: 0; opacity: 0.8;
}

.film-strip {
  position: fixed;
  top: 0; bottom: 0;
  width: 40px;
  background: #3a2e1a;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  align-items: center;
  padding: 20px 0;
  z-index: 10;
}
.film-strip.left { left: 0; border-right: 2px solid #2a2010; }
.film-strip.right { right: 0; border-left: 2px solid #2a2010; }

.perforation {
  width: 16px;
  height: 11px;
  border-radius: 2px;
  background: #f0e8d8;
  border: 1px solid #5a4a2a;
  box-shadow: inset 0 0 4px rgba(0,0,0,0.2);
}

.stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 28px;
  z-index: 1;
  padding: 40px 0;
}

.brand {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.lens-ring {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  border: 3px solid #8b6914;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  box-shadow: 0 0 0 6px #f0e8d8, 0 0 0 8px #c4a87a, 0 0 24px rgba(139,105,20,0.25);
  animation: lens-breathe 4s ease-in-out infinite;
}

@keyframes lens-breathe {
  0%,100% { box-shadow: 0 0 0 6px #f0e8d8, 0 0 0 8px #c4a87a, 0 0 24px rgba(139,105,20,0.25); }
  50% { box-shadow: 0 0 0 6px #f0e8d8, 0 0 0 8px #c4a87a, 0 0 40px rgba(139,105,20,0.45); }
}

.lens-inner {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #4a6a80, #1a3040);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #3a5a70;
}

.lens-icon {
  font-size: 24px;
  color: #7ab0cc;
  line-height: 1;
}

.brand-name {
  font-family: 'Playfair Display', serif;
  font-size: 34px;
  font-weight: 700;
  color: #3a2e1a;
  letter-spacing: 5px;
  margin: 0;
  text-shadow: 0 1px 0 rgba(255,255,255,0.5);
}

.brand-sub {
  font-size: 11px;
  color: #8b7550;
  letter-spacing: 3px;
  margin: 0;
  text-transform: uppercase;
}

.card {
  width: 380px;
  background: #fffdf7;
  border: 1px solid #d4c4a8;
  border-radius: 3px;
  padding: 36px;
  box-shadow:
    0 0 0 1px #e8dcc8,
    0 20px 60px rgba(58,46,26,0.15),
    inset 0 1px 0 rgba(255,255,255,0.8);
  position: relative;
}

.card::before {
  content: '▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪';
  position: absolute;
  top: -1px;
  left: 0; right: 0;
  text-align: center;
  font-size: 6px;
  color: #c4a87a;
  letter-spacing: 2px;
}

.tabs {
  display: flex;
  position: relative;
  margin-bottom: 28px;
  border-bottom: 1px solid #d4c4a8;
}

.tab {
  flex: 1;
  padding: 10px;
  background: none;
  border: none;
  color: #b0966a;
  font-family: 'Courier Prime', monospace;
  font-size: 13px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: color 0.3s;
  position: relative;
  z-index: 1;
}

.tab.active {
  color: #3a2e1a;
  font-weight: 700;
}

.tab-ink {
  position: absolute;
  bottom: -1px;
  left: 0;
  width: 50%;
  height: 2px;
  background: linear-gradient(90deg, #8b6914, #c4a87a);
  transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.label {
  font-size: 10px;
  color: #8b7550;
  letter-spacing: 3px;
  text-transform: uppercase;
  font-weight: 700;
}

.input-wrap {
  display: flex;
  align-items: center;
  background: #faf6ee;
  border: 1.5px solid #d4c4a8;
  border-radius: 2px;
  transition: border-color 0.25s, box-shadow 0.25s;
}

.input-wrap:focus-within {
  border-color: #8b6914;
  box-shadow: 0 0 0 3px rgba(139,105,20,0.1);
}

.input-icon {
  padding: 0 12px;
  color: #b0966a;
  font-size: 15px;
  user-select: none;
}

.input {
  flex: 1;
  background: none;
  border: none;
  outline: none;
  color: #3a2e1a;
  font-family: 'Courier Prime', monospace;
  font-size: 14px;
  padding: 12px 0;
  letter-spacing: 1px;
}

.input::placeholder { color: #c4b48a; }

.eye-btn {
  padding: 0 12px;
  background: none;
  border: none;
  color: #b0966a;
  cursor: pointer;
  font-size: 16px;
  transition: color 0.2s;
}
.eye-btn:hover { color: #8b6914; }

.error-msg {
  font-size: 12px;
  color: #c4704a;
  margin: 0;
  letter-spacing: 1px;
  padding: 8px 12px;
  background: rgba(196,112,74,0.08);
  border-left: 2px solid #c4704a;
  border-radius: 1px;
}

.shake-enter-active { animation: shake 0.4s ease; }

@keyframes shake {
  0%,100% { transform: translateX(0); }
  20% { transform: translateX(-6px); }
  40% { transform: translateX(6px); }
  60% { transform: translateX(-4px); }
  80% { transform: translateX(4px); }
}

.submit-btn {
  width: 100%;
  padding: 13px;
  margin-top: 4px;
  background: linear-gradient(135deg, #6b5010, #8b6914);
  border: none;
  border-radius: 2px;
  color: #fdf8f0;
  font-family: 'Playfair Display', serif;
  font-size: 15px;
  font-style: italic;
  letter-spacing: 3px;
  cursor: pointer;
  transition: all 0.3s;
  position: relative;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(139,105,20,0.2);
}

.submit-btn::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255,255,255,0.12), transparent);
  opacity: 0;
  transition: opacity 0.3s;
}

.submit-btn:hover::after { opacity: 1; }
.submit-btn:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(139,105,20,0.3); }
.submit-btn:active { transform: translateY(0); }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

.btn-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #fdf8f0;
  animation: dot-blink 1.2s ease-in-out infinite;
}
.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes dot-blink {
  0%,80%,100% { opacity: 0.2; transform: scale(0.8); }
  40% { opacity: 1; transform: scale(1); }
}

.switch-hint {
  margin: 20px 0 0;
  text-align: center;
  font-size: 12px;
  color: #8b7550;
  letter-spacing: 1px;
}

.switch-link {
  color: #8b6914;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 3px;
  font-weight: 700;
  transition: color 0.2s;
}
.switch-link:hover { color: #6b5010; }

.film-code {
  font-size: 10px;
  color: #8b7550;
  letter-spacing: 4px;
  margin: 0;
  text-transform: uppercase;
}

@media (max-width: 480px) {
  .film-strip { display: none; }
  .card { width: calc(100vw - 40px); padding: 24px; }
  .brand-name { font-size: 26px; }
}
</style>