<template>
  <div class="app-shell">
    <div class="paper-texture"></div>

    <!-- 顶部导航栏 -->
    <header class="topbar">
      <button class="back-btn" @click="router.push(`/memories/${route.params.id}`)">← 返回</button>
      <h1 class="page-title">编辑记忆</h1>
      <button class="submit-btn" @click="handleSubmit" :disabled="submitting || loading">
        <span v-if="!submitting">保存</span>
        <span v-else class="btn-dots"><span v-for="n in 3" :key="n" class="dot"></span></span>
      </button>
    </header>

    <!-- 加载中 -->
    <div class="loading-state" v-if="loading">
      <div class="loading-strip">
        <div class="loading-frame" v-for="n in 5" :key="n" :style="{ animationDelay: n * 0.1 + 's' }"></div>
      </div>
    </div>

    <div class="editor-layout" v-else>

      <!-- 左侧：主编辑区 -->
      <div class="editor-main">

        <!-- 内容输入 -->
        <div class="content-block">
          <div class="block-label">记忆内容</div>
          <textarea v-model="form.content" class="content-textarea" placeholder="写下这一刻的故事..." rows="6"></textarea>
          <div class="char-count">{{ form.content?.length || 0 }} / 50000</div>
        </div>

        <!-- 现有媒体文件提示 -->
        <div class="media-notice" v-if="existingImages.length > 0 || existingVideo">
          <div class="notice-label">⚠ 现有媒体文件</div>
          <p class="notice-text">编辑接口不支持修改媒体文件。如需更改，请删除此记忆后重新创建。</p>

          <!-- 现有图片预览 -->
          <div class="existing-images" v-if="existingImages.length > 0">
            <div class="existing-label">图片 · {{ existingImages.length }} 张</div>
            <div class="existing-grid">
              <div v-for="img in existingImages" :key="img.id" class="existing-thumb">
                <img :src="img.url" class="existing-img" />
              </div>
            </div>
          </div>

          <!-- 现有视频提示 -->
          <div class="existing-video-note" v-if="existingVideo">
            <span>▷ 含视频文件 · {{ formatFileSize(existingVideo.file_size) }}</span>
          </div>
        </div>

      </div>

      <!-- 右侧：元数据面板 -->
      <div class="editor-side">

        <!-- 心情 -->
        <div class="side-block">
          <div class="side-label">心情</div>
          <div class="mood-grid">
            <button v-for="m in moodOptions" :key="m.value" class="mood-btn" :class="{ active: form.mood === m.value }"
              @click="form.mood = form.mood === m.value ? '' : m.value">
              <span class="mood-emoji">{{ m.emoji }}</span>
              <span class="mood-text">{{ m.label }}</span>
            </button>
          </div>
          <input v-model="form.mood" class="side-input" placeholder="或输入自定义心情..." style="margin-top: 8px;" />
        </div>

        <!-- 位置 -->
        <div class="side-block">
          <div class="side-label">⌖ 位置</div>
          <input v-model="form.location" class="side-input" placeholder="如：大理·洱海边" maxlength="300" />
        </div>

        <!-- 发生时间 -->
        <div class="side-block">
          <div class="side-label">◷ 发生时间</div>
          <input v-model="form.happened_at" class="side-input" type="datetime-local" />
        </div>

        <!-- 记忆本 -->
        <div class="side-block">
          <div class="side-label">◫ 记忆本</div>
          <select v-model="form.book_id" class="side-select">
            <option value="">不归属记忆本</option>
            <option v-for="book in books" :key="book.id" :value="book.id">
              {{ book.title }}
            </option>
          </select>
        </div>

        <!-- 标签 -->
        <div class="side-block">
          <div class="side-label"># 标签</div>
          <div class="tag-input-wrap">
            <input v-model="tagInput" class="side-input" placeholder="输入标签后按回车" @keydown.enter.prevent="addTag" />
            <button class="tag-add-btn" @click="addTag">+</button>
          </div>
          <div class="tag-list" v-if="form.tags.length > 0">
            <span v-for="(t, i) in form.tags" :key="i" class="tag-chip" @click="removeTag(i)"># {{ t }} ✕</span>
          </div>
        </div>

        <!-- 错误提示 -->
        <div class="error-msg" v-if="errorMsg">{{ errorMsg }}</div>

        <!-- 成功提示 -->
        <div class="success-msg" v-if="successMsg">{{ successMsg }}</div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { memories as memoriesApi, books as booksApi } from '../api'

const router = useRouter()
const route = useRoute()

const loading = ref(true)
const submitting = ref(false)
const errorMsg = ref('')
const successMsg = ref('')
const tagInput = ref('')
const books = ref([])
const existingImages = ref([])
const existingVideo = ref(null)

const form = ref({
  content: '',
  mood: '',
  location: '',
  happened_at: '',
  book_id: '',
  tags: [],
})

const moodOptions = [
  { value: '开心', label: '开心', emoji: '😊' },
  { value: '难过', label: '难过', emoji: '😢' },
  { value: '平静', label: '平静', emoji: '😌' },
  { value: '兴奋', label: '兴奋', emoji: '🤩' },
  { value: '感恩', label: '感恩', emoji: '🙏' },
]

// ── 加载已有数据回填 ──
async function loadMemory() {
  loading.value = true
  try {
    const data = await memoriesApi.get(route.params.id)

    form.value.content = data.content || ''
    form.value.mood = data.mood || ''
    form.value.location = data.location || ''
    form.value.book_id = data.book_id || ''
    form.value.tags = data.tags || []

    // happened_at 转成 datetime-local 格式 (YYYY-MM-DDTHH:mm)
    if (data.happened_at) {
      const d = new Date(data.happened_at)
      form.value.happened_at = d.toISOString().slice(0, 16)
    }

    // 保存现有媒体（仅展示，不可编辑）
    existingImages.value = data.images || []
    existingVideo.value = data.video || null

  } catch {
    errorMsg.value = '加载记忆失败'
  } finally {
    loading.value = false
  }
}

async function loadBooks() {
  try {
    const data = await booksApi.list()
    books.value = data.items || []
  } catch { }
}

// ── 标签处理 ──
function addTag() {
  const t = tagInput.value.trim()
  if (t && !form.value.tags.includes(t)) {
    form.value.tags.push(t)
  }
  tagInput.value = ''
}

function removeTag(i) {
  form.value.tags.splice(i, 1)
}

// ── 提交 ──
async function handleSubmit() {
  errorMsg.value = ''
  successMsg.value = ''
  submitting.value = true

  try {
    const payload = {
      content: form.value.content || null,
      mood: form.value.mood || null,
      location: form.value.location || null,
      happened_at: form.value.happened_at || null,
      book_id: form.value.book_id || null,
      tags: form.value.tags,
    }

    await memoriesApi.update(route.params.id, payload)
    successMsg.value = '保存成功'

    setTimeout(() => {
      router.push(`/memories/${route.params.id}`)
    }, 800)

  } catch (e) {
    errorMsg.value = e.detail || '保存失败，请重试'
  } finally {
    submitting.value = false
  }
}

function formatFileSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / 1024 / 1024).toFixed(1) + ' MB'
}

onMounted(() => {
  loadMemory()
  loadBooks()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Courier+Prime:wght@400;700&display=swap');

.app-shell {
  min-height: 100vh;
  background: #f5efe6;
  font-family: 'Courier Prime', monospace;
  color: #3a2e1a;
  position: relative;
}

/* .grain {
  position: fixed; inset: -50%; width: 200%; height: 200%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E");
  opacity: 0.12; pointer-events: none;
  animation: grain-drift 8s steps(10) infinite; z-index: 0;
} */

/* @keyframes grain-drift {
  0%,100%{transform:translate(0,0)}10%{transform:translate(-2%,-3%)}20%{transform:translate(3%,2%)}
  30%{transform:translate(-1%,4%)}40%{transform:translate(4%,-1%)}50%{transform:translate(-3%,1%)}
  60%{transform:translate(1%,-4%)}70%{transform:translate(-4%,3%)}80%{transform:translate(2%,-2%)}90%{transform:translate(-2%,4%)}
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

.page-title {
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  font-weight: 400;
  font-style: italic;
  color: #e8d5b0;
}

.submit-btn {
  padding: 8px 24px;
  background: #8b6914;
  border: none;
  border-radius: 1px;
  color: #e8d5b0;
  font-family: 'Playfair Display', serif;
  font-size: 14px;
  font-style: italic;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.25s;
  min-width: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(139, 115, 85, 0.3);
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-dots {
  display: flex;
  gap: 4px;
  align-items: center;
}

.dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #e8d5b0;
  animation: dot-blink 1.2s ease-in-out infinite;
}

.dot:nth-child(2) {
  animation-delay: 0.2s
}

.dot:nth-child(3) {
  animation-delay: 0.4s
}

@keyframes dot-blink {

  0%,
  80%,
  100% {
    opacity: 0.2;
    transform: scale(0.8)
  }

  40% {
    opacity: 1;
    transform: scale(1)
  }
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

/* ── 布局 ── */
.editor-layout {
  display: flex;
  gap: 32px;
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px;
  position: relative;
  z-index: 1;
}

.editor-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.editor-side {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* ── 内容输入 ── */
.block-label {
  font-size: 10px;
  color: #6b5a3a;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.content-block {
  position: relative;
}

.content-textarea {
  width: 100%;
  background: #ffffff;
  border: 1px solid #d4c4a8;
  border-radius: 2px;
  color: #3a2e1a;
  font-family: 'Courier Prime', monospace;
  font-size: 15px;
  line-height: 1.8;
  padding: 16px;
  resize: vertical;
  outline: none;
  transition: border-color 0.25s;
  letter-spacing: 0.5px;
  min-height: 180px;
}

.content-textarea:focus {
  border-color: #6b5a3a;
}

.content-textarea::placeholder {
  color: #3a2e1a;
}

.char-count {
  text-align: right;
  font-size: 10px;
  color: #3a2e1a;
  margin-top: 4px;
  letter-spacing: 1px;
}

/* ── 现有媒体提示 ── */
.media-notice {
  background: #1a1208;
  border: 1px solid #3a2e1a;
  border-radius: 2px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.notice-label {
  font-size: 10px;
  color: #8b6914;
  letter-spacing: 2px;
}

.notice-text {
  font-size: 12px;
  color: #5a4a2a;
  line-height: 1.6;
  letter-spacing: 0.5px;
}

.existing-label {
  font-size: 10px;
  color: #5a4a2a;
  letter-spacing: 2px;
  margin-bottom: 6px;
}

.existing-grid {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.existing-thumb {
  width: 70px;
  height: 70px;
  border-radius: 1px;
  overflow: hidden;
  border: 1px solid #2a2015;
}

.existing-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  opacity: 0.7;
}

.existing-video-note {
  font-size: 11px;
  color: #5a4a2a;
  letter-spacing: 1px;
}

/* ── 右侧面板 ── */
.side-block {
  background: #ffffff;
  border: 1px solid #e0d0b8;
  border-radius: 2px;
  padding: 16px;
}

.side-label {
  font-size: 10px;
  color: #6b5a3a;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 10px;
}

.side-input {
  width: 100%;
  background: #fdf8f0;
  border: 1px solid #d4c4a8;
  border-radius: 1px;
  color: #3a2e1a;
  font-family: 'Courier Prime', monospace;
  font-size: 13px;
  padding: 8px 10px;
  outline: none;
  transition: border-color 0.2s;
  letter-spacing: 0.5px;
}

.side-input:focus {
  border-color: #6b5a3a;
}

.side-input::placeholder {
  color: #3a2e1a;
}

.side-input[type="datetime-local"]::-webkit-calendar-picker-indicator {
  filter: invert(0.4) sepia(1) saturate(0.5);
  cursor: pointer;
}

.side-select {
  width: 100%;
  background: #fdf8f0;
  border: 1px solid #d4c4a8;
  border-radius: 1px;
  color: #3a2e1a;
  font-family: 'Courier Prime', monospace;
  font-size: 13px;
  padding: 8px 10px;
  outline: none;
  cursor: pointer;
  transition: border-color 0.2s;
}

.side-select:focus {
  border-color: #6b5a3a;
}

.side-select option {
  background: #1a1208;
}

/* ── 心情 ── */
.mood-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
}

.mood-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 8px 4px;
  background: #fdf8f0;
  border: 1px solid #e0d0b8;
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s;
}

.mood-btn:hover {
  border-color: #6b5a3a;
}

.mood-btn.active {
  border-color: #8b7355;
  background: rgba(139, 115, 85, 0.1);
}

.mood-emoji {
  font-size: 18px;
  line-height: 1;
}

.mood-text {
  font-size: 9px;
  color: #5a4a2a;
  letter-spacing: 1px;
}

.mood-btn.active .mood-text {
  color: #c4a882;
}

/* ── 标签 ── */
.tag-input-wrap {
  display: flex;
  gap: 6px;
}

.tag-add-btn {
  padding: 0 12px;
  background: #e8dcc8;
  border: 1px solid #d4c4a8;
  border-radius: 1px;
  color: #8b7355;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.tag-add-btn:hover {
  background: #503c1b;
  color: #c4a882;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}

.tag-chip {
  font-size: 11px;
  color: #8b7355;
  border: 1px solid #3a2e1a;
  padding: 3px 8px;
  border-radius: 1px;
  cursor: pointer;
  transition: all 0.2s;
  letter-spacing: 1px;
}

.tag-chip:hover {
  border-color: #c4704a;
  color: #c4704a;
}

/* ── 提示 ── */
.error-msg {
  font-size: 12px;
  color: #c4704a;
  padding: 10px 12px;
  background: rgba(196, 112, 74, 0.08);
  border-left: 2px solid #c4704a;
  border-radius: 1px;
  letter-spacing: 1px;
}

.success-msg {
  font-size: 12px;
  color: #7a9e7e;
  padding: 10px 12px;
  background: rgba(122, 158, 126, 0.08);
  border-left: 2px solid #7a9e7e;
  border-radius: 1px;
  letter-spacing: 1px;
}

.side-select option { background: #fdf8f0; color: #3a2e1a; }

/* ── 响应式 ── */
@media (max-width: 768px) {
  .editor-layout {
    flex-direction: column;
    padding: 20px 16px;
  }

  .editor-side {
    width: 100%;
  }
}
</style>