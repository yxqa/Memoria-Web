<template>
  <div class="app-shell">
    <header class="float-bar">
      <button class="back-btn" @click="router.push('/timeline')">← 返回</button>
      <h1 class="page-title">记录新记忆</h1>
      <button class="submit-btn" @click="handleSubmit" :disabled="submitting">{{ submitting ? '冲印中...' : '冲印' }}</button>
    </header>

    <div class="editor-layout" v-motion :initial="{ opacity: 0, y: 10 }" :enter="{ opacity: 1, y: 0, transition: { duration: 400 } }">
      <div class="editor-main">
        <div class="block">
          <div class="block-label">记忆内容</div>
          <textarea v-model="form.content" class="content-textarea" placeholder="写下这一刻的故事..." rows="8"></textarea>
          <div class="char-count">{{ form.content?.length || 0 }} / 50000</div>
        </div>

        <div class="block">
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

        <div class="block">
          <div class="block-label">视频 <span class="block-hint">最多1个，≤100MB</span></div>
          <div v-if="!previewVideo" class="video-upload-area">
            <label class="video-label">
              <input type="file" accept=".mp4,.webm" style="display:none" @change="onVideoSelect" />
              <span class="video-icon">▶</span><span>点击上传视频</span>
            </label>
          </div>
          <div v-else class="video-preview">
            <video :src="previewVideo" controls class="preview-video"></video>
            <button class="remove-video" @click="removeVideo">✕ 移除视频</button>
          </div>
        </div>
      </div>

      <div class="editor-side">
        <div class="side-block">
          <div class="side-label">心情</div>
          <div class="mood-grid">
            <button v-for="m in moodOptions" :key="m.value" class="mood-btn" :class="{ active: form.mood === m.value }" @click="form.mood = form.mood === m.value ? '' : m.value">
              <span class="mood-emoji">{{ m.emoji }}</span><span class="mood-text">{{ m.label }}</span>
            </button>
          </div>
          <input v-model="form.mood" class="side-input" placeholder="或输入自定义心情..." style="margin-top:6px" />
        </div>
        <div class="side-block">
          <div class="side-label">⌖ 位置</div>
          <input v-model="form.location" class="side-input" placeholder="如：大理·洱海边" maxlength="300" />
        </div>
        <div class="side-block">
          <div class="side-label">◷ 发生时间</div>
          <input v-model="form.happened_at" class="side-input" type="datetime-local" />
        </div>
        <div class="side-block">
          <div class="side-label">◫ 记忆本</div>
          <select v-model="form.book_id" class="side-select">
            <option value="">不归属记忆本</option>
            <option v-for="book in books" :key="book.id" :value="book.id">{{ book.title }}</option>
          </select>
        </div>
        <div class="side-block">
          <div class="side-label"># 标签</div>
          <div class="tag-input-wrap">
            <input v-model="tagInput" class="side-input" placeholder="输入标签后按回车" @keydown.enter.prevent="addTag" />
            <button class="tag-add-btn" @click="addTag">+</button>
          </div>
          <div class="tag-list" v-if="form.tags.length > 0">
            <span v-for="(t, i) in form.tags" :key="i" class="tag-chip" @click="removeTag(i)">{{ t }} ✕</span>
          </div>
        </div>
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
const form = ref({ content: '', mood: '', location: '', happened_at: '', book_id: '', tags: [] })
const tagInput = ref('')
const previewImages = ref([])
const imageFiles = ref([])
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

function onImageSelect(e) {
  const files = Array.from(e.target.files)
  const remaining = 9 - previewImages.value.length
  const toAdd = files.slice(0, remaining)
  for (const file of toAdd) {
    if (file.size > 10 * 1024 * 1024) { errorMsg.value = `图片 ${file.name} 超过10MB`; continue }
    const url = URL.createObjectURL(file)
    previewImages.value.push({ file, url }); imageFiles.value.push(file)
  }
  e.target.value = ''
}

function removeImage(idx) { URL.revokeObjectURL(previewImages.value[idx].url); previewImages.value.splice(idx, 1); imageFiles.value.splice(idx, 1) }

function onVideoSelect(e) {
  const file = e.target.files[0]; if (!file) return
  if (file.size > 100 * 1024 * 1024) { errorMsg.value = '视频超过100MB'; return }
  videoFile.value = file; previewVideo.value = URL.createObjectURL(file); e.target.value = ''
}

function removeVideo() { URL.revokeObjectURL(previewVideo.value); previewVideo.value = null; videoFile.value = null }

function addTag() { const t = tagInput.value.trim(); if (t && !form.value.tags.includes(t)) form.value.tags.push(t); tagInput.value = '' }
function removeTag(i) { form.value.tags.splice(i, 1) }

async function handleSubmit() {
  errorMsg.value = ''
  if (!form.value.content && imageFiles.value.length === 0 && !videoFile.value) { errorMsg.value = '内容、图片、视频至少填写一项'; return }
  submitting.value = true
  try {
    const data = { content: form.value.content || null, mood: form.value.mood || null, location: form.value.location || null, happened_at: form.value.happened_at || null, book_id: form.value.book_id || null, tags: form.value.tags }
    await memoriesApi.create(data, imageFiles.value, videoFile.value)
    router.push('/timeline')
  } catch (e) { errorMsg.value = e.detail || '提交失败，请重试' }
  finally { submitting.value = false }
}

async function loadBooks() { try { const data = await booksApi.list(); books.value = data.items || [] } catch {} }
onMounted(loadBooks)
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #faf8f6; font-family: Inter, system-ui, sans-serif; color: #2c2c2c; }

.float-bar {
  position: sticky; top: 16px; z-index: 50;
  max-width: 1100px; margin: 0 auto 24px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 10px 18px;
  background: rgba(255,255,255,0.85); backdrop-filter: blur(16px);
  border: 1px solid #e8e3df; border-radius: 16px;
}
.back-btn { background: none; border: none; color: #b08989; font-size: 13px; font-weight: 500; cursor: pointer; }
.back-btn:hover { color: #8b6565; }
.page-title { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 500; font-style: italic; color: #2c2c2c; }
.submit-btn { padding: 8px 24px; background: #8b6565; border: none; border-radius: 20px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.25s; }
.submit-btn:hover:not(:disabled) { background: #7a5555; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.editor-layout { display: flex; gap: 32px; max-width: 1100px; margin: 0 auto; padding: 0 24px 60px; }
.editor-main { flex: 1; display: flex; flex-direction: column; gap: 28px; }
.editor-side { width: 260px; flex-shrink: 0; display: flex; flex-direction: column; gap: 18px; }

.block-label { font-size: 11px; color: #555; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
.block-hint { font-size: 10px; color: #999; font-weight: 400; }

.content-textarea {
  width: 100%; background: #fff; border: 1px solid #e8e3df; border-radius: 12px;
  color: #2c2c2c; font-family: Inter, system-ui, sans-serif; font-size: 15px;
  line-height: 1.8; padding: 16px; resize: vertical; outline: none;
  transition: border-color 0.25s; min-height: 200px;
}
.content-textarea:focus { border-color: #b08989; }
.content-textarea::placeholder { color: #bbb; }
.char-count { text-align: right; font-size: 10px; color: #bbb; margin-top: 4px; font-family: 'JetBrains Mono', monospace; }

.image-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px; }
.image-slot { aspect-ratio: 1; border-radius: 8px; position: relative; overflow: hidden; }
.image-slot.filled { border: 1px solid #e8e3df; }
.preview-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.remove-img { position: absolute; top: 4px; right: 4px; width: 22px; height: 22px; background: rgba(0,0,0,0.6); border: none; border-radius: 50%; color: #fff; font-size: 10px; cursor: pointer; opacity: 0; transition: opacity 0.2s; }
.image-slot:hover .remove-img { opacity: 1; }
.img-order { position: absolute; bottom: 4px; left: 4px; background: rgba(0,0,0,0.5); color: #fff; font-size: 10px; padding: 1px 6px; border-radius: 3px; font-family: 'JetBrains Mono', monospace; }
.add-slot { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; border: 2px dashed #e8e3df; cursor: pointer; transition: all 0.2s; }
.add-slot:hover { border-color: #b08989; background: rgba(176,137,137,0.04); }
.add-icon { font-size: 24px; color: #bbb; }
.add-label { font-size: 10px; color: #999; }

.video-upload-area { border: 2px dashed #e8e3df; border-radius: 12px; padding: 40px; text-align: center; transition: all 0.2s; }
.video-upload-area:hover { border-color: #b08989; background: rgba(176,137,137,0.04); }
.video-label { cursor: pointer; color: #999; font-size: 13px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.video-icon { font-size: 28px; color: #bbb; }
.preview-video { width: 100%; border-radius: 12px; }
.remove-video { margin-top: 8px; padding: 6px 14px; background: none; border: 1px solid #c44; border-radius: 8px; color: #c44; font-size: 12px; cursor: pointer; }

.side-label { font-size: 10px; color: #555; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 6px; text-transform: uppercase; }
.mood-grid { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }
.mood-btn { display: flex; align-items: center; gap: 4px; padding: 5px 10px; background: #fff; border: 1px solid #e8e3df; border-radius: 16px; cursor: pointer; transition: all 0.2s; font-size: 12px; }
.mood-btn:hover { border-color: #b08989; }
.mood-btn.active { border-color: #b08989; background: rgba(176,137,137,0.08); color: #8b6565; }
.mood-emoji { font-size: 13px; } .mood-text { font-size: 11px; color: #555; }

.side-input { width: 100%; background: #fff; border: 1px solid #e8e3df; border-radius: 8px; color: #2c2c2c; font-family: Inter, system-ui, sans-serif; font-size: 13px; padding: 9px 12px; outline: none; transition: border-color 0.2s; }
.side-input:focus { border-color: #b08989; }
.side-input::placeholder { color: #bbb; }
.side-select { width: 100%; background: #fff; border: 1px solid #e8e3df; border-radius: 8px; color: #2c2c2c; font-family: Inter, system-ui, sans-serif; font-size: 13px; padding: 9px 12px; outline: none; cursor: pointer; }

.tag-input-wrap { display: flex; gap: 4px; }
.tag-input-wrap .side-input { flex: 1; }
.tag-add-btn { padding: 9px 14px; background: #8b6565; border: none; border-radius: 8px; color: #fff; font-size: 16px; cursor: pointer; }
.tag-add-btn:hover { background: #7a5555; }
.tag-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.tag-chip { font-size: 11px; color: #555; padding: 4px 10px; background: #faf8f6; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.tag-chip:hover { background: rgba(204,68,68,0.06); color: #c44; }

.error-msg { font-size: 12px; color: #c44; padding: 10px 14px; background: rgba(204,68,68,0.06); border-radius: 8px; border-left: 3px solid #c44; }

@media (max-width: 800px) { .editor-layout { flex-direction: column; } .editor-side { width: 100%; } }
</style>
