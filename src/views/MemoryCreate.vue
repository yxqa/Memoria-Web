<template>
  <div class="app-shell">
    <div class="paper-texture"></div>

    <!-- 顶部导航栏 -->
    <header class="topbar">
      <button class="back-btn" @click="router.push('/timeline')">← 返回</button>
      <h1 class="page-title">记录新记忆</h1>
      <button class="submit-btn" @click="handleSubmit" :disabled="submitting">
        <span v-if="!submitting">冲印</span>
        <span v-else class="btn-dots"><span v-for="n in 3" :key="n" class="dot"></span></span>
      </button>
    </header>

    <div class="editor-layout">

      <!-- 左侧：主编辑区 -->
      <div class="editor-main">

        <!-- 内容输入 -->
        <div class="content-block">
          <div class="block-label">记忆内容</div>
          <textarea v-model="form.content" class="content-textarea" placeholder="写下这一刻的故事..." rows="6"></textarea>
          <div class="char-count">{{ form.content?.length || 0 }} / 50000</div>
        </div>

        <!-- 图片上传 -->
        <div class="media-block">
          <div class="block-label">图片 <span class="block-hint">最多9张，每张≤10MB</span></div>
          <div class="image-grid">
            <div v-for="(img, idx) in previewImages" :key="idx" class="image-slot filled">
              <img :src="img.url" class="preview-img" />
              <button class="remove-img" @click="removeImage(idx)">✕</button>
              <span class="img-order">{{ idx + 1 }}</span>
            </div>

            <label class="image-slot add-slot" v-if="previewImages.length < 9">
              <input type="file" accept=".jpg,.jpeg,.png,.webp" multiple style="display:none" @change="onImageSelect" />
              <span class="add-icon">⊕</span>
              <span class="add-label">添加图片</span>
            </label>
          </div>
        </div>

        <!-- 视频上传 -->
        <div class="media-block">
          <div class="block-label">视频 <span class="block-hint">最多1个，≤100MB，mp4/webm</span></div>
          <div v-if="!previewVideo" class="video-upload-area">
            <label class="video-label">
              <input type="file" accept=".mp4,.webm" style="display:none" @change="onVideoSelect" />
              <span class="video-icon">▷</span>
              <span>点击上传视频</span>
            </label>
          </div>
          <div v-else class="video-preview">
            <video :src="previewVideo" controls class="preview-video"></video>
            <button class="remove-video" @click="removeVideo">✕ 移除视频</button>
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
          <!-- 自定义心情 -->
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

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { memories as memoriesApi, books as booksApi } from '../api'

const router = useRouter()

const form = ref({
  content: '',
  mood: '',
  location: '',
  happened_at: '',
  book_id: '',
  tags: [],
})

const tagInput = ref('')
const previewImages = ref([])   // { file, url }
const imageFiles = ref([])      // File[]
const previewVideo = ref(null)
const videoFile = ref(null)
const books = ref([])
const submitting = ref(false)
const errorMsg = ref('')

const moodOptions = [
  { value: '开心', label: '开心', emoji: '😊' },
  { value: '难过', label: '难过', emoji: '😢' },
  { value: '平静', label: '平静', emoji: '😌' },
  { value: '兴奋', label: '兴奋', emoji: '🤩' },
  { value: '感恩', label: '感恩', emoji: '🙏' },
]

// ── 图片处理 ──
function onImageSelect(e) {
  const files = Array.from(e.target.files)
  const remaining = 9 - previewImages.value.length
  const toAdd = files.slice(0, remaining)

  for (const file of toAdd) {
    if (file.size > 10 * 1024 * 1024) {
      errorMsg.value = `图片 ${file.name} 超过10MB`
      continue
    }
    const url = URL.createObjectURL(file)
    previewImages.value.push({ file, url })
    imageFiles.value.push(file)
  }
  e.target.value = ''
}

function removeImage(idx) {
  URL.revokeObjectURL(previewImages.value[idx].url)
  previewImages.value.splice(idx, 1)
  imageFiles.value.splice(idx, 1)
}

// ── 视频处理 ──
function onVideoSelect(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 100 * 1024 * 1024) {
    errorMsg.value = '视频超过100MB'
    return
  }
  videoFile.value = file
  previewVideo.value = URL.createObjectURL(file)
  e.target.value = ''
}

function removeVideo() {
  URL.revokeObjectURL(previewVideo.value)
  previewVideo.value = null
  videoFile.value = null
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

  if (!form.value.content && imageFiles.value.length === 0 && !videoFile.value) {
    errorMsg.value = '内容、图片、视频至少填写一项'
    return
  }

  submitting.value = true
  try {
    const data = {
      content: form.value.content || null,
      mood: form.value.mood || null,
      location: form.value.location || null,
      happened_at: form.value.happened_at || null,
      book_id: form.value.book_id || null,
      tags: form.value.tags,
    }

    await memoriesApi.create(data, imageFiles.value, videoFile.value)
    router.push('/timeline')
  } catch (e) {
    errorMsg.value = e.detail || '提交失败，请重试'
  } finally {
    submitting.value = false
  }
}

// ── 加载记忆本 ──
async function loadBooks() {
  try {
    const data = await booksApi.list()
    books.value = data.items || []
  } catch { }
}

onMounted(loadBooks)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Courier+Prime:wght@400;700&display=swap');

/* *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; } */

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
  width: 200%; height: 200%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.06'/%3E%3C/svg%3E");
  opacity: 0.12; pointer-events: none;
  animation: grain-drift 8s steps(10) infinite;
  z-index: 0;
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

/* ── 布局 ── */
.editor-layout {
  display: flex;
  gap: 0;
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 32px;
  gap: 32px;
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

/* ── 通用块 ── */
.block-label {
  font-size: 10px;
  color: #6b5a3a;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.block-hint {
  font-size: 9px;
  color: #3a2e1a;
  letter-spacing: 1px;
  text-transform: none;
}

/* ── 内容输入 ── */
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

/* ── 图片网格 ── */
.media-block {}

.image-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 8px;
}

.image-slot {
  aspect-ratio: 1;
  border-radius: 2px;
  position: relative;
  overflow: hidden;
}

.image-slot.filled {
  border: 1px solid #2a2015;
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.remove-img {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background: rgba(0, 0, 0, 0.7);
  border: none;
  border-radius: 50%;
  color: #e8d5b0;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.remove-img:hover {
  background: rgba(196, 112, 74, 0.8);
}

.img-order {
  position: absolute;
  bottom: 4px;
  left: 4px;
  font-size: 9px;
  color: rgba(232, 213, 176, 0.7);
  background: rgba(0, 0, 0, 0.5);
  padding: 1px 5px;
  border-radius: 1px;
}

.add-slot {
  border: 1px dashed #2a2015;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.2s;
  background: #fdf8f0;
  min-height: 100px;
}

.add-slot:hover {
  border-color: #6b5a3a;
  background: #1a1208;
}

.add-icon {
  font-size: 22px;
  color: #c4a87a;
}

.add-label {
  font-size: 10px;
  color: #b0966a;
  letter-spacing: 1px;
}

/* ── 视频 ── */
.video-upload-area {
  border: 1px dashed #d4c4a8;
  border-radius: 2px;
  padding: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fdf8f0;
  transition: all 0.2s;
}

.video-upload-area:hover {
  border-color: #6b5a3a;
}

.video-label {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  color: #b0966a;
  font-size: 12px;
  letter-spacing: 2px;
  transition: color 0.2s;
}

.video-label:hover {
  color: #6b5a3a;
}

.video-icon {
  font-size: 32px;
}

.video-preview {
  position: relative;
}

.preview-video {
  width: 100%;
  border-radius: 2px;
  border: 1px solid #e8dcc8;
  display: block;
}

.remove-video {
  margin-top: 8px;
  background: none;
  border: 1px solid #3a2e1a;
  color: #c4704a;
  font-family: 'Courier Prime', monospace;
  font-size: 11px;
  letter-spacing: 1px;
  padding: 5px 12px;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 1px;
}

.remove-video:hover {
  border-color: #c4704a;
  background: rgba(196, 112, 74, 0.08);
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

/* datetime-local 样式修复 */
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
  background: #fdf8f0;
  color: #3a2e1a;
}

/* ── 心情网格 ── */
.mood-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 6px;
  margin-bottom: 0;
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
  color: #8b6914;
  font-size: 16px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
}

.tag-add-btn:hover {
  background: #3a2e1a;
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

/* ── 错误提示 ── */
.error-msg {
  font-size: 12px;
  color: #c4704a;
  padding: 10px 12px;
  background: rgba(196, 112, 74, 0.08);
  border-left: 2px solid #c4704a;
  border-radius: 1px;
  letter-spacing: 1px;
}

/* ── 响应式 ── */
@media (max-width: 768px) {
  .editor-layout {
    flex-direction: column;
    padding: 20px 16px;
  }

  .editor-side {
    width: 100%;
  }

  .mood-grid {
    grid-template-columns: repeat(5, 1fr);
  }
}
</style>