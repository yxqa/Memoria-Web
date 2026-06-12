<template>
  <div class="app-shell">
    <header class="topbar"><div class="brand"><span class="brand-lens">◎</span><span class="brand-name">Memoria</span></div><div class="share-badge">分享内容</div></header>

    <div class="password-gate" v-if="needPassword" v-motion :initial="{ opacity: 0, y: 10 }" :enter="{ opacity: 1, y: 0 }">
      <div class="gate-card"><div class="gate-icon">🔒</div><h2 class="gate-title">此内容受密码保护</h2><p class="gate-desc">请输入访问密码查看分享内容</p><input v-model="passwordInput" class="gate-input" type="text" placeholder="输入访问密码" maxlength="10" @keydown.enter="submitPassword" /><div class="gate-error" v-if="passwordError">{{ passwordError }}</div><button class="gate-btn" @click="submitPassword" :disabled="loading">{{ loading ? '验证中...' : '确认访问' }}</button></div>
    </div>

    <div class="loading-state" v-else-if="loading"><div class="loading-dots"><span v-for="n in 3" :key="n" class="ldot"></span></div><span class="loading-text">正在加载记忆...</span></div>
    <div class="error-state" v-else-if="errorState"><div class="error-icon">{{ errorIcon }}</div><h2 class="error-title">{{ errorTitle }}</h2><p class="error-desc">{{ errorDesc }}</p></div>

    <div class="share-layout" v-else-if="shareData" v-motion :initial="{ opacity: 0 }" :enter="{ opacity: 1, transition: { duration: 400 } }">
      <div class="share-info-bar"><span class="shared-by">{{ shareData.shared_by.username }} 分享了这条记忆</span><span class="expire-info">⏱ 有效至 {{ formatDateTime(shareData.expire_at) }}</span></div>
      <div class="content-area">
        <div class="media-col" v-if="shareData.images?.length > 0 || shareData.video">
          <div class="gallery" v-if="shareData.images?.length > 0"><div class="gallery-main" @click="openLightbox(activeIdx)"><img :src="activeImage.url" class="main-img" /><div class="img-overlay"><span>{{ activeIdx+1 }}/{{ shareData.images.length }}</span><span>⤢</span></div></div><div class="thumb-row" v-if="shareData.images.length > 1"><div v-for="(img, idx) in shareData.images" :key="idx" class="thumb" :class="{ active: activeIdx === idx }" @click="activeIdx = idx"><img :src="img.url" class="thumb-img" /></div></div></div>
          <div class="video-block" v-if="shareData.video"><video :src="shareData.video.url" controls class="detail-video"></video></div>
        </div>
        <div class="text-col">
          <div class="meta-bar"><span class="meta-mood" v-if="shareData.memory.mood">{{ shareData.memory.mood }}</span><span class="meta-loc" v-if="shareData.memory.location">⌖ {{ shareData.memory.location }}</span><span class="meta-happened" v-if="shareData.memory.happened_at">◷ {{ formatDate(shareData.memory.happened_at) }}</span></div>
          <div class="content-body" v-if="shareData.memory.content"><p v-for="(para, i) in paragraphs" :key="i" class="content-para">{{ para }}</p></div>
          <div class="content-empty" v-else>— 仅有媒体文件 —</div>
          <div class="tags-section" v-if="shareData.memory.tags?.length > 0"><span class="tag" v-for="t in shareData.memory.tags" :key="t"># {{ t }}</span></div>
        </div>
      </div>
      <div class="promo-bar"><span class="promo-text">由 <strong>Memoria</strong> 记录与分享</span></div>
    </div>

    <transition name="fade"><div class="lightbox" v-if="lightboxOpen" @click.self="lightboxOpen = false"><button class="lb-close" @click="lightboxOpen = false">✕</button><button class="lb-prev" @click="prevImage" v-if="shareData.images.length > 1">‹</button><img :src="shareData.images[lightboxIdx].url" class="lb-img" /><button class="lb-next" @click="nextImage" v-if="shareData.images.length > 1">›</button><div class="lb-counter">{{ lightboxIdx+1 }}/{{ shareData.images.length }}</div></div></transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const shareData = ref(null); const loading = ref(false); const needPassword = ref(false)
const passwordInput = ref(''); const passwordError = ref('')
const errorState = ref(false); const errorTitle = ref(''); const errorDesc = ref(''); const errorIcon = ref('◎')
const activeIdx = ref(0); const lightboxOpen = ref(false); const lightboxIdx = ref(0)
const activeImage = computed(() => shareData.value?.images?.[activeIdx.value] || {})
const paragraphs = computed(() => shareData.value?.memory?.content?.split('\n').filter(p => p.trim()) || [])

async function fetchShare(password = null) { loading.value = true; passwordError.value = ''; try { const params = password ? `?password=${encodeURIComponent(password)}` : ''; const resp = await fetch(`/api/v1/s/${route.params.token}${params}`); const data = await resp.json(); if (resp.status === 401 && data.code === 'SHARE_PASSWORD_REQUIRED') { needPassword.value = true; return }; if (resp.status === 401 && data.code === 'INVALID_PASSWORD') { passwordError.value = '密码错误，请重试'; return }; if (resp.status === 404) { errorState.value = true; errorIcon.value = '◎'; errorTitle.value = '分享链接不存在'; errorDesc.value = '该链接可能已被删除'; return }; if (resp.status === 410) { errorState.value = true; errorIcon.value = '⏱'; errorTitle.value = '分享链接已过期'; errorDesc.value = '有效期已结束'; return }; if (!resp.ok) { errorState.value = true; errorIcon.value = '⚠'; errorTitle.value = '访问失败'; errorDesc.value = '请稍后重试'; return }; shareData.value = data; needPassword.value = false } catch { errorState.value = true; errorIcon.value = '⚠'; errorTitle.value = '网络异常'; errorDesc.value = '请检查网络连接' } finally { loading.value = false } }
function submitPassword() { if (!passwordInput.value.trim()) { passwordError.value = '请输入密码'; return }; fetchShare(passwordInput.value.trim()) }
function openLightbox(idx) { lightboxIdx.value = idx; lightboxOpen.value = true }
function prevImage() { lightboxIdx.value = (lightboxIdx.value-1+shareData.value.images.length)%shareData.value.images.length }
function nextImage() { lightboxIdx.value = (lightboxIdx.value+1)%shareData.value.images.length }
function formatDate(iso) { if(!iso) return ''; const d=new Date(iso); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}` }
function formatDateTime(iso) { if(!iso) return ''; return `${formatDate(iso)} ${String(new Date(iso).getHours()).padStart(2,'0')}:${String(new Date(iso).getMinutes()).padStart(2,'0')}` }
onMounted(() => fetchShare())
</script>

<style scoped>
.app-shell { min-height: 100vh; background: var(--color-bg); font-family: var(--font-body); color: var(--color-ink); }
.topbar { display: flex; align-items: center; justify-content: space-between; padding: 16px 36px; border-bottom: 1px solid var(--color-border-light); background: rgba(250,248,246,0.85); backdrop-filter: blur(12px); position: sticky; top: 0; z-index: 10; }
.brand { display: flex; align-items: center; gap: 8px; }
.brand-lens { font-size: 20px; color: var(--color-accent); }
.brand-name { font-family: var(--font-display); font-size: 18px; color: var(--color-ink); font-style: italic; }
.share-badge { font-size: 11px; color: var(--color-ink-muted); padding: 4px 12px; border: 1px solid var(--color-border); border-radius: 12px; }

.password-gate { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 57px); }
.gate-card { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); padding: 48px 40px; width: 380px; display: flex; flex-direction: column; align-items: center; gap: 16px; box-shadow: var(--shadow-lg); }
.gate-icon { font-size: 40px; }
.gate-title { font-family: var(--font-display); font-size: 20px; color: var(--color-ink); font-weight: 500; font-style: italic; }
.gate-desc { font-size: 13px; color: var(--color-ink-muted); }
.gate-input { width: 100%; background: var(--color-bg); border: 1px solid var(--color-border); border-radius: var(--radius-sm); color: var(--color-ink); font-family: var(--font-mono); font-size: 14px; padding: 12px 14px; outline: none; text-align: center; }
.gate-input:focus { border-color: var(--color-accent); }
.gate-error { font-size: 12px; color: var(--color-error); }
.gate-btn { width: 100%; padding: 13px; background: var(--color-accent-deep); border: none; border-radius: var(--radius-sm); color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; }
.gate-btn:hover:not(:disabled) { background: #7a5555; }
.gate-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.loading-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 120px; }
.loading-dots { display: flex; gap: 8px; }
.ldot { width: 8px; height: 8px; border-radius: 50%; background: var(--color-accent); animation: dot-pulse 1.2s ease-in-out infinite; }
@keyframes dot-pulse { 0%,80%,100%{opacity:0.15;transform:scale(0.7)} 40%{opacity:1;transform:scale(1)} }
.loading-text { font-size: 12px; color: var(--color-ink-muted); }

.error-state { display: flex; flex-direction: column; align-items: center; gap: 16px; padding: 120px; }
.error-icon { font-size: 48px; color: var(--color-border); }
.error-title { font-family: var(--font-display); font-size: 22px; color: var(--color-ink-muted); font-style: italic; }
.error-desc { font-size: 13px; color: var(--color-ink-faint); }

.share-info-bar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 12px 36px; background: var(--color-accent-ghost); border-bottom: 1px solid var(--color-border-light); }
.shared-by { font-size: 13px; color: var(--color-accent-deep); font-weight: 500; }
.expire-info { font-size: 11px; color: var(--color-ink-muted); font-family: var(--font-mono); }

.content-area { display: flex; gap: 40px; max-width: 1000px; margin: 0 auto; padding: 40px 32px 24px; }
.media-col { width: 480px; flex-shrink: 0; }
.gallery-main { position: relative; border-radius: var(--radius-md); overflow: hidden; cursor: pointer; }
.main-img { width: 100%; height: 320px; object-fit: cover; display: block; }
.img-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 12px 16px; background: linear-gradient(transparent, rgba(0,0,0,0.5)); display: flex; justify-content: space-between; color: #fff; font-size: 12px; font-family: var(--font-mono); opacity: 0; transition: opacity 0.2s; }
.gallery-main:hover .img-overlay { opacity: 1; }
.thumb-row { display: flex; gap: 6px; margin-top: 8px; }
.thumb { width: 56px; height: 56px; border-radius: var(--radius-sm); overflow: hidden; cursor: pointer; opacity: 0.5; border: 2px solid transparent; }
.thumb.active { opacity: 1; border-color: var(--color-accent); }
.thumb-img { width: 100%; height: 100%; object-fit: cover; }
.detail-video { width: 100%; border-radius: var(--radius-md); }
.text-col { flex: 1; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.meta-bar { display: flex; gap: 10px; flex-wrap: wrap; }
.meta-mood { font-size: 13px; padding: 3px 10px; background: var(--color-accent-ghost); border-radius: 10px; color: var(--color-accent-deep); }
.meta-loc, .meta-happened { font-size: 12px; color: var(--color-ink-muted); }
.content-para { font-size: 15px; color: var(--color-ink); line-height: 1.9; }
.content-empty { font-size: 13px; color: var(--color-ink-faint); font-style: italic; padding: 20px 0; }
.tags-section { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { font-size: 11px; color: var(--color-ink-muted); padding: 3px 10px; background: var(--color-bg); border-radius: 10px; }
.promo-bar { padding: 20px; text-align: center; border-top: 1px solid var(--color-border); }
.promo-text { font-size: 12px; color: var(--color-ink-faint); }
.promo-text strong { color: var(--color-accent-deep); }

.lightbox { position: fixed; inset: 0; z-index: 200; background: rgba(0,0,0,0.94); display: flex; align-items: center; justify-content: center; }
.lb-img { max-width: 90vw; max-height: 85vh; object-fit: contain; border-radius: 4px; }
.lb-close { position: absolute; top: 20px; right: 24px; background: none; border: none; color: #fff; font-size: 28px; cursor: pointer; }
.lb-prev, .lb-next { position: absolute; top: 50%; transform: translateY(-50%); background: none; border: none; color: #fff; font-size: 40px; cursor: pointer; padding: 20px; }
.lb-prev { left: 8px; } .lb-next { right: 8px; }
.lb-counter { position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.5); font-family: var(--font-mono); font-size: 13px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
@media (max-width: 800px) { .content-area { flex-direction: column; padding: 24px 16px; } .media-col { width: 100%; } .main-img { height: 240px; } }
</style>