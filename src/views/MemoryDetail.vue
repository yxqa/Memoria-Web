<template>
  <div class="app-shell">
    <div class="paper-texture"></div>

    <!-- 顶栏 -->
    <header class="topbar">
      <button class="back-btn" @click="router.push('/timeline')">← 返回</button>
      <div class="topbar-actions" v-if="memory">
        <button class="action-btn" @click="openShare">分享</button>
        <button class="action-btn" @click="goEdit">编辑</button>
        <button class="action-btn danger" @click="confirmDelete = true">删除</button>
      </div>
    </header>

    <!-- 加载中 -->
    <div class="loading-state" v-if="loading">
      <div class="loading-strip">
        <div class="loading-frame" v-for="n in 5" :key="n" :style="{ animationDelay: n * 0.1 + 's' }"></div>
      </div>
    </div>

    <!-- 详情内容 -->
    <div class="detail-layout" v-else-if="memory">

      <!-- 左侧：媒体区 -->
      <div class="media-col" v-if="memory.images?.length > 0 || memory.video">

        <!-- 图片画廊 -->
        <div class="gallery" v-if="memory.images?.length > 0">
          <!-- 主图 -->
          <div class="gallery-main" @click="openLightbox(activeImageIdx)">
            <img :src="activeImage.url" class="main-img" :alt="'图片' + (activeImageIdx + 1)" />
            <div class="img-overlay">
              <span class="img-counter">{{ activeImageIdx + 1 }} / {{ memory.images.length }}</span>
              <span class="img-expand">⤢ 查看原图</span>
            </div>
          </div>
          <!-- 缩略图列表 -->
          <div class="thumb-row" v-if="memory.images.length > 1">
            <div v-for="(img, idx) in memory.images" :key="img.id" class="thumb"
              :class="{ active: activeImageIdx === idx }" @click="activeImageIdx = idx">
              <img :src="img.url" class="thumb-img" />
            </div>
          </div>
        </div>

        <!-- 视频 -->
        <div class="video-block" v-if="memory.video">
          <div class="block-label">视频</div>
          <video :src="memory.video.url" controls class="detail-video"></video>
          <div class="video-meta">
            {{ formatFileSize(memory.video.file_size) }}
          </div>
        </div>

      </div>

      <!-- 右侧：内容区 -->
      <div class="content-col">

        <!-- 元信息条 -->
        <div class="meta-bar">
          <span class="meta-date">{{ formatDate(memory.created_at) }}</span>
          <span class="meta-mood" v-if="memory.mood">{{ memory.mood }}</span>
          <span class="meta-location" v-if="memory.location">⌖ {{ memory.location }}</span>
          <span class="meta-happened" v-if="memory.happened_at">◷ {{ formatDate(memory.happened_at) }}</span>
        </div>

        <!-- 记忆本 -->
        <div class="book-badge" v-if="memory.book_title">
          <span class="book-icon">◫</span>
          <span>{{ memory.book_title }}</span>
        </div>

        <!-- 正文 -->
        <div class="content-body" v-if="memory.content">
          <p v-for="(para, i) in paragraphs" :key="i" class="content-para">{{ para }}</p>
        </div>

        <div class="content-empty" v-else>
          <span>— 仅有媒体文件 —</span>
        </div>

        <!-- 标签 -->
        <div class="tags-section" v-if="memory.tags?.length > 0">
          <span class="tag" v-for="t in memory.tags" :key="t"># {{ t }}</span>
        </div>

        <!-- 底部时间戳 -->
        <div class="timestamps">
          <span>创建于 {{ formatDateTime(memory.created_at) }}</span>
          <span v-if="memory.updated_at !== memory.created_at">· 更新于 {{ formatDateTime(memory.updated_at) }}</span>
        </div>

      </div>
    </div>

    <!-- 404 -->
    <div class="not-found" v-else>
      <div class="not-found-icon">◎</div>
      <p>记忆不存在或已删除</p>
      <button class="back-link" @click="router.push('/timeline')">返回时间线</button>
    </div>

    <!-- 灯箱 -->
    <transition name="fade">
      <div class="lightbox" v-if="lightboxOpen" @click.self="lightboxOpen = false">
        <button class="lb-close" @click="lightboxOpen = false">✕</button>
        <button class="lb-prev" @click="prevImage" v-if="memory.images.length > 1">‹</button>
        <img :src="memory.images[lightboxIdx].url" class="lb-img" />
        <button class="lb-next" @click="nextImage" v-if="memory.images.length > 1">›</button>
        <div class="lb-counter">{{ lightboxIdx + 1 }} / {{ memory.images.length }}</div>
      </div>
    </transition>

    <!-- 删除确认弹窗 -->
    <transition name="fade">
      <div class="modal-overlay" v-if="confirmDelete" @click.self="confirmDelete = false">
        <div class="modal">
          <div class="modal-icon">⚠</div>
          <h3 class="modal-title">确认删除</h3>
          <p class="modal-desc">删除后将无法恢复，包括所有关联的媒体文件。</p>
          <div class="modal-actions">
            <button class="modal-cancel" @click="confirmDelete = false">取消</button>
            <button class="modal-confirm" @click="handleDelete" :disabled="deleting">
              {{ deleting ? '删除中...' : '确认删除' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

    <transition name="fade">
      <div class="modal-overlay" v-if="showShare" @click.self="closeShare">
        <div class="modal share-modal">

          <!-- 未生成状态 -->
          <template v-if="!shareResult">
            <h3 class="modal-title">分享这条记忆</h3>

            <div class="share-field">
              <label class="share-label">有效期</label>
              <div class="expire-options">
                <button v-for="opt in expireOptions" :key="opt.value" class="expire-btn"
                  :class="{ active: shareForm.expire_hours === opt.value }"
                  @click="shareForm.expire_hours = opt.value">{{ opt.label }}</button>
              </div>
            </div>

            <div class="share-field">
              <label class="share-label">访问密码 <span class="share-hint">（可选，4~10位）</span></label>
              <input v-model="shareForm.password" class="share-input" type="text" placeholder="不设置则任何人可访问"
                maxlength="10" />
            </div>

            <div class="share-error" v-if="shareError">{{ shareError }}</div>

            <div class="modal-actions">
              <button class="modal-cancel" @click="closeShare">取消</button>
              <button class="modal-confirm" @click="handleShare" :disabled="sharing">
                {{ sharing ? '生成中...' : '生成链接' }}
              </button>
            </div>
          </template>

          <!-- 已生成状态 -->
          <template v-else>
            <div class="share-success-icon">✓</div>
            <h3 class="modal-title">分享链接已生成</h3>

            <div class="share-url-box">
              <span class="share-url-text">{{ shareResult.share_url }}</span>
              <button class="copy-btn" @click="copyUrl">{{ copied ? '已复制' : '复制' }}</button>
            </div>

            <div class="share-meta">
              <span v-if="shareResult.has_password">🔒 已设置访问密码</span>
              <span>⏱ 有效期至 {{ formatDateTime(shareResult.expire_at) }}</span>
            </div>

            <div class="modal-actions">
              <button class="modal-confirm" @click="closeShare">完成</button>
            </div>
          </template>

        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { memories as memoriesApi } from '../api'
import { share } from '../api'

const router = useRouter()
const route = useRoute()

const memory = ref(null)
const loading = ref(true)
const confirmDelete = ref(false)
const deleting = ref(false)
const activeImageIdx = ref(0)
const lightboxOpen = ref(false)
const lightboxIdx = ref(0)
const showShare = ref(false)
const sharing = ref(false)
const shareResult = ref(null)
const shareError = ref('')
const copied = ref(false)
 
const shareForm = ref({ expire_hours: 24, password: '' })
 
const expireOptions = [
  { label: '1小时', value: 1 },
  { label: '24小时', value: 24 },
  { label: '48小时', value: 48 },
]
 
function openShare() {
  shareResult.value = null
  shareError.value = ''
  shareForm.value = { expire_hours: 24, password: '' }
  showShare.value = true
}
 
function closeShare() {
  showShare.value = false
  shareResult.value = null
  copied.value = false
}
 
async function handleShare() {
  shareError.value = ''
  if (shareForm.value.password && (shareForm.value.password.length < 4)) {
    shareError.value = '密码至少4位'
    return
  }
  sharing.value = true
  try {
    const payload = { expire_hours: shareForm.value.expire_hours }
    if (shareForm.value.password) payload.password = shareForm.value.password
 
    const data = await share.create(route.params.id, payload.expire_hours, payload.password || null)
    // 拼接完整 URL
    data.share_url = window.location.origin + '/share/' + data.token
    shareResult.value = data
  } catch (e) {
    shareError.value = e.detail || '生成失败，请重试'
  } finally {
    sharing.value = false
  }
}
 
async function copyUrl() {
  try {
    await navigator.clipboard.writeText(shareResult.value.share_url)
    copied.value = true
    setTimeout(() => { copied.value = false }, 2000)
  } catch {
    copied.value = false
  }
}

const activeImage = computed(() => memory.value?.images?.[activeImageIdx.value] || {})

const paragraphs = computed(() =>
  memory.value?.content?.split('\n').filter(p => p.trim()) || []
)

async function loadMemory() {
  loading.value = true
  try {
    const data = await memoriesApi.get(route.params.id)
    memory.value = data
  } catch {
    memory.value = null
  } finally {
    loading.value = false
  }
}

async function handleDelete() {
  deleting.value = true
  try {
    await memoriesApi.delete(route.params.id)
    router.push('/timeline')
  } catch {
    confirmDelete.value = false
  } finally {
    deleting.value = false
  }
}

function goEdit() {
  router.push(`/memories/${route.params.id}/edit`)
}

function openLightbox(idx) {
  lightboxIdx.value = idx
  lightboxOpen.value = true
}

function prevImage() {
  lightboxIdx.value = (lightboxIdx.value - 1 + memory.value.images.length) % memory.value.images.length
}

function nextImage() {
  lightboxIdx.value = (lightboxIdx.value + 1) % memory.value.images.length
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${formatDate(iso)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

onMounted(loadMemory)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Courier+Prime:wght@400;700&display=swap');

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

.app-shell {
  min-height: 100vh;
  background: #f5efe6;
  font-family: 'Courier Prime', monospace;
  color: #3a2e1a;
  position: relative;
}

/* .grain {
  position: fixed;
  inset: -50%;
  width: 200%;
  height: 200%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E");
  opacity: 0.12;
  pointer-events: none;
  animation: grain-drift 8s steps(10) infinite;
  z-index: 0;
}

@keyframes grain-drift {

  0%,
  100% {
    transform: translate(0, 0)
  }

  10% {
    transform: translate(-2%, -3%)
  }

  20% {
    transform: translate(3%, 2%)
  }

  30% {
    transform: translate(-1%, 4%)
  }

  40% {
    transform: translate(4%, -1%)
  }

  50% {
    transform: translate(-3%, 1%)
  }

  60% {
    transform: translate(1%, -4%)
  }

  70% {
    transform: translate(-4%, 3%)
  }

  80% {
    transform: translate(2%, -2%)
  }

  90% {
    transform: translate(-2%, 4%)
  }
} */

.paper-texture {
  position: fixed;
  inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none;
  z-index: 0;
  opacity: 0.6;
}

/* ── 顶栏 ── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 32px;
  border-bottom: 1px solid #d4c4a8;
  position: sticky;
  top: 0;
  background: rgba(245, 239, 230, 0.92);
  backdrop-filter: blur(8px);
  z-index: 10;
  -webkit-backdrop-filter: blur(8px);
}

.back-btn {
  background: none;
  border: none;
  color: #6b5a3a;
  font-family: 'Courier Prime', monospace;
  font-size: 13px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: color 0.2s;
  padding: 6px 0;
}

.back-btn:hover {
  color: #c4a882;
}

.topbar-actions {
  display: flex;
  gap: 10px;
}

.action-btn {
  padding: 7px 18px;
  background: none;
  border: 1px solid #d4c4a8;
  border-radius: 1px;
  color: #8b6914;
  font-family: 'Courier Prime', monospace;
  font-size: 12px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: #8b7355;
  color: #e8d5b0;
}

.action-btn.danger {
  color: #c4704a;
  border-color: #3a1a0a;
}

.action-btn.danger:hover {
  border-color: #c4704a;
  background: rgba(196, 112, 74, 0.08);
}

/* ── 加载 ── */
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 120px;
}

.loading-strip {
  display: flex;
  gap: 4px;
}

.loading-frame {
  width: 18px;
  height: 60px;
  background: #2a2015;
  border-radius: 1px;
  animation: frame-pulse 1.2s ease-in-out infinite;
}

@keyframes frame-pulse {

  0%,
  100% {
    opacity: 0.2;
    height: 30px
  }

  50% {
    opacity: 0.8;
    height: 60px
  }
}

/* ── 详情布局 ── */
.detail-layout {
  display: flex;
  gap: 40px;
  max-width: 1100px;
  margin: 0 auto;
  padding: 40px 32px;
  position: relative;
  z-index: 1;
}

.media-col {
  width: 480px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.content-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* ── 图片画廊 ── */
.gallery {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.gallery-main {
  position: relative;
  overflow: hidden;
  border-radius: 2px;
  cursor: pointer;
  border: 1px solid #2a2015;
  aspect-ratio: 4/3;
}

.main-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.4s ease;
}

.gallery-main:hover .main-img {
  transform: scale(1.02);
}

.img-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px 14px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.7), transparent);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  opacity: 0;
  transition: opacity 0.25s;
}

.gallery-main:hover .img-overlay {
  opacity: 1;
}

.img-counter {
  font-size: 11px;
  color: rgba(232, 213, 176, 0.8);
  letter-spacing: 2px;
}

.img-expand {
  font-size: 11px;
  color: rgba(232, 213, 176, 0.6);
  letter-spacing: 1px;
}

.thumb-row {
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding-bottom: 4px;
}

.thumb-row::-webkit-scrollbar {
  height: 3px;
}

.thumb-row::-webkit-scrollbar-track {
  background: #1a1208;
}

.thumb-row::-webkit-scrollbar-thumb {
  background: #3a2e1a;
  border-radius: 2px;
}

.thumb {
  width: 60px;
  height: 60px;
  flex-shrink: 0;
  border-radius: 1px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid #2a2015;
  transition: border-color 0.2s;
}

.thumb.active {
  border-color: #8b7355;
}

.thumb:hover {
  border-color: #6b5a3a;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* ── 视频 ── */
.block-label {
  font-size: 10px;
  color: #6b5a3a;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.detail-video {
  width: 100%;
  border-radius: 2px;
  border: 1px solid #2a2015;
  display: block;
}

.video-meta {
  font-size: 10px;
  color: #3a2e1a;
  letter-spacing: 1px;
  margin-top: 6px;
}

/* ── 元信息条 ── */
.meta-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  padding-bottom: 16px;
  border-bottom: 1px solid #2a2015;
}

.meta-date {
  font-size: 12px;
  color: #6b5a3a;
  letter-spacing: 3px;
}

.meta-mood {
  font-size: 11px;
  color: #8b7355;
  padding: 2px 10px;
  border: 1px solid #3a2e1a;
  border-radius: 1px;
}

.meta-location {
  font-size: 11px;
  color: #5a4a2a;
}

.meta-happened {
  font-size: 11px;
  color: #5a4a2a;
}

/* ── 记忆本 ── */
.book-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #6b5a3a;
  letter-spacing: 2px;
  padding: 4px 10px;
  border: 1px solid #2a2015;
  border-radius: 1px;
  width: fit-content;
}

.book-icon {
  font-size: 14px;
}

/* ── 正文 ── */
.content-body {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.content-para {
  font-size: 15px;
  color: #4a3a20;
  line-height: 1.9;
  letter-spacing: 0.5px;
}

.content-empty {
  font-size: 13px;
  color: #3a2e1a;
  letter-spacing: 3px;
  font-style: italic;
  padding: 32px 0;
}

/* ── 标签 ── */
.tags-section {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 16px;
  border-top: 1px solid #1a1208;
}

.tag {
  font-size: 11px;
  color: #5a4a2a;
  letter-spacing: 1px;
  transition: color 0.2s;
}

.tag:hover {
  color: #8b7355;
}

/* ── 时间戳 ── */
.timestamps {
  font-size: 10px;
  color: #3a2e1a;
  letter-spacing: 1px;
  margin-top: auto;
  padding-top: 24px;
}

/* ── 404 ── */
.not-found {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 120px;
}

.not-found-icon {
  font-size: 48px;
  color: #2a2015;
}

.not-found p {
  font-size: 14px;
  color: #5a4a2a;
  letter-spacing: 2px;
}

.back-link {
  background: none;
  border: 1px solid #3a2e1a;
  border-radius: 1px;
  color: #6b5a3a;
  font-family: 'Courier Prime', monospace;
  font-size: 12px;
  letter-spacing: 2px;
  padding: 8px 20px;
  cursor: pointer;
  transition: all 0.2s;
}

.back-link:hover {
  border-color: #8b7355;
  color: #c4a882;
}

/* ── 灯箱 ── */
.lightbox {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(8, 6, 3, 0.95);
  display: flex;
  align-items: center;
  justify-content: center;
}

.lb-img {
  max-width: 90vw;
  max-height: 88vh;
  object-fit: contain;
  border-radius: 2px;
  box-shadow: 0 0 60px rgba(0, 0, 0, 0.8);
}

.lb-close {
  position: absolute;
  top: 20px;
  right: 24px;
  background: none;
  border: 1px solid #3a2e1a;
  border-radius: 50%;
  width: 36px;
  height: 36px;
  color: #8b7355;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.lb-close:hover {
  border-color: #c4a882;
  color: #e8d5b0;
}

.lb-prev,
.lb-next {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  background: rgba(26, 18, 8, 0.8);
  border: 1px solid #3a2e1a;
  border-radius: 1px;
  color: #8b7355;
  font-size: 28px;
  cursor: pointer;
  padding: 12px 16px;
  transition: all 0.2s;
}

.lb-prev {
  left: 20px;
}

.lb-next {
  right: 20px;
}

.lb-prev:hover,
.lb-next:hover {
  border-color: #8b7355;
  color: #e8d5b0;
}

.lb-counter {
  position: absolute;
  bottom: 20px;
  font-size: 11px;
  color: #5a4a2a;
  letter-spacing: 3px;
}

/* ── 删除弹窗 ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(8, 6, 3, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal {
  background: #fdf8f0;
  border: 1px solid #d4c4a8;
  border-radius: 2px;
  padding: 36px;
  width: 340px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

.modal-icon {
  font-size: 28px;
  color: #c4704a;
}

.modal-title {
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  color: #e8d5b0;
  font-weight: 400;
}

.modal-desc {
  font-size: 12px;
  color: #5a4a2a;
  letter-spacing: 1px;
  text-align: center;
  line-height: 1.6;
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.modal-cancel {
  padding: 8px 20px;
  background: none;
  border: 1px solid #3a2e1a;
  border-radius: 1px;
  color: #6b5a3a;
  font-family: 'Courier Prime', monospace;
  font-size: 12px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-cancel:hover {
  border-color: #6b5a3a;
  color: #c4a882;
}

.modal-confirm {
  padding: 8px 20px;
  background: rgba(196, 112, 74, 0.15);
  border: 1px solid #c4704a;
  border-radius: 1px;
  color: #c4704a;
  font-family: 'Courier Prime', monospace;
  font-size: 12px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
}

.modal-confirm:hover {
  background: rgba(196, 112, 74, 0.25);
}

.modal-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ── 过渡 ── */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* ── 响应式 ── */
@media (max-width: 768px) {
  .detail-layout {
    flex-direction: column;
    padding: 20px 16px;
  }

  .media-col {
    width: 100%;
  }
}

.share-modal {
  width: 400px;
}
 
.share-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
 
.share-label {
  font-size: 10px;
  color: #8b7550;
  letter-spacing: 3px;
  text-transform: uppercase;
}
 
.share-hint {
  font-size: 9px;
  color: #b0966a;
  letter-spacing: 1px;
  text-transform: none;
}
 
.expire-options {
  display: flex;
  gap: 8px;
}
 
.expire-btn {
  flex: 1;
  padding: 8px;
  background: #fdf8f0;
  border: 1px solid #d4c4a8;
  border-radius: 2px;
  color: #8b7550;
  font-family: 'Courier Prime', monospace;
  font-size: 12px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
}
.expire-btn:hover { border-color: #8b6914; color: #3a2e1a; }
.expire-btn.active { border-color: #8b6914; background: rgba(139,105,20,0.08); color: #3a2e1a; }
 
.share-input {
  width: 100%;
  background: #fdf8f0;
  border: 1px solid #d4c4a8;
  border-radius: 2px;
  color: #3a2e1a;
  font-family: 'Courier Prime', monospace;
  font-size: 13px;
  padding: 9px 12px;
  outline: none;
  transition: border-color 0.2s;
}
.share-input:focus { border-color: #8b6914; }
.share-input::placeholder { color: #c4b48a; }
 
.share-error {
  font-size: 12px;
  color: #c4704a;
  padding: 8px 12px;
  background: rgba(196,112,74,0.08);
  border-left: 2px solid #c4704a;
}
 
.share-success-icon {
  font-size: 32px;
  color: #7a9e7e;
  text-align: center;
}
 
.share-url-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fdf8f0;
  border: 1px solid #d4c4a8;
  border-radius: 2px;
  padding: 10px 12px;
}
 
.share-url-text {
  flex: 1;
  font-size: 12px;
  color: #6b5010;
  font-family: 'Courier Prime', monospace;
  word-break: break-all;
  letter-spacing: 0.5px;
}
 
.copy-btn {
  flex-shrink: 0;
  padding: 5px 12px;
  background: #8b6914;
  border: none;
  border-radius: 1px;
  color: #f5efe6;
  font-family: 'Courier Prime', monospace;
  font-size: 11px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: background 0.2s;
}
.copy-btn:hover { background: #6b5010; }
 
.share-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 11px;
  color: #b0966a;
  letter-spacing: 1px;
}
</style>