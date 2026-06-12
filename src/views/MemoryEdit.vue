<template>
  <div class="app-shell">
    <header class="float-bar">
      <button class="back-btn" @click="router.push(`/memories/${route.params.id}`)">← 返回</button>
      <h1 class="page-title">编辑记忆</h1>
      <button class="submit-btn" @click="handleSubmit" :disabled="submitting || loading">{{ submitting ? '保存中...' : '保存' }}</button>
    </header>

    <div class="loading-state" v-if="loading"><div class="loading-ring"></div></div>

    <div class="editor-layout" v-else v-motion :initial="{ opacity: 0, y: 10 }" :enter="{ opacity: 1, y: 0, transition: { duration: 400 } }">
      <div class="editor-main">
        <div class="block">
          <div class="block-label">记忆内容</div>
          <textarea v-model="form.content" class="content-textarea" placeholder="写下这一刻的故事..." rows="8"></textarea>
          <div class="char-count">{{ form.content?.length || 0 }} / 50000</div>
        </div>

        <div class="media-notice" v-if="existingImages.length > 0 || existingVideo">
          <div class="notice-label">⚠ 现有媒体文件（不可编辑）</div>
          <p class="notice-text">编辑接口不支持修改媒体文件。如需更改，请删除此记忆后重新创建。</p>
          <div class="existing-grid" v-if="existingImages.length > 0">
            <div v-for="img in existingImages" :key="img.id" class="existing-thumb"><img :src="img.url" class="existing-img" /></div>
          </div>
          <div class="existing-video-note" v-if="existingVideo">▶ 含视频 · {{ formatFileSize(existingVideo.file_size) }}</div>
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
        <div class="side-block"><div class="side-label">⌖ 位置</div><input v-model="form.location" class="side-input" placeholder="如：大理·洱海边" maxlength="300" /></div>
        <div class="side-block"><div class="side-label">◷ 发生时间</div><input v-model="form.happened_at" class="side-input" type="datetime-local" /></div>
        <div class="side-block"><div class="side-label">◫ 记忆本</div><select v-model="form.book_id" class="side-select"><option value="">不归属记忆本</option><option v-for="book in books" :key="book.id" :value="book.id">{{ book.title }}</option></select></div>
        <div class="side-block">
          <div class="side-label"># 标签</div>
          <div class="tag-input-wrap"><input v-model="tagInput" class="side-input" placeholder="输入标签后按回车" @keydown.enter.prevent="addTag" /><button class="tag-add-btn" @click="addTag">+</button></div>
          <div class="tag-list" v-if="form.tags.length > 0"><span v-for="(t, i) in form.tags" :key="i" class="tag-chip" @click="removeTag(i)">{{ t }} ✕</span></div>
        </div>
        <div class="error-msg" v-if="errorMsg">{{ errorMsg }}</div>
        <div class="success-msg" v-if="successMsg">{{ successMsg }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { memories as memoriesApi, books as booksApi } from '../api'

const router = useRouter(); const route = useRoute()
const loading = ref(true); const submitting = ref(false); const errorMsg = ref(''); const successMsg = ref('')
const tagInput = ref(''); const books = ref([]); const existingImages = ref([]); const existingVideo = ref(null)
const form = ref({ content: '', mood: '', location: '', happened_at: '', book_id: '', tags: [] })
const moodOptions = [
  { value: '开心', label: '开心', emoji: '😊' }, { value: '难过', label: '难过', emoji: '😢' },
  { value: '平静', label: '平静', emoji: '😌' }, { value: '兴奋', label: '兴奋', emoji: '🤩' }, { value: '感恩', label: '感恩', emoji: '🙏' },
]

async function loadMemory() {
  loading.value = true
  try {
    const data = await memoriesApi.get(route.params.id)
    form.value.content = data.content || ''; form.value.mood = data.mood || ''; form.value.location = data.location || ''
    form.value.book_id = data.book_id || ''; form.value.tags = data.tags || []
    if (data.happened_at) { const d = new Date(data.happened_at); form.value.happened_at = d.toISOString().slice(0, 16) }
    existingImages.value = data.images || []; existingVideo.value = data.video || null
  } catch { errorMsg.value = '加载记忆失败' }
  finally { loading.value = false }
}

async function loadBooks() { try { const data = await booksApi.list(); books.value = data.items || [] } catch {} }

function addTag() { const t = tagInput.value.trim(); if (t && !form.value.tags.includes(t)) form.value.tags.push(t); tagInput.value = '' }
function removeTag(i) { form.value.tags.splice(i, 1) }

async function handleSubmit() {
  errorMsg.value = ''; successMsg.value = ''; submitting.value = true
  try {
    const payload = { content: form.value.content || null, mood: form.value.mood || null, location: form.value.location || null, happened_at: form.value.happened_at || null, book_id: form.value.book_id || null, tags: form.value.tags }
    await memoriesApi.update(route.params.id, payload)
    successMsg.value = '保存成功'
    setTimeout(() => { router.push(`/memories/${route.params.id}`) }, 800)
  } catch (e) { errorMsg.value = e.detail || '保存失败，请重试' }
  finally { submitting.value = false }
}

function formatFileSize(bytes) { if (!bytes) return ''; if (bytes < 1024*1024) return (bytes/1024).toFixed(1)+' KB'; return (bytes/1024/1024).toFixed(1)+' MB' }
onMounted(() => { loadMemory(); loadBooks() })
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #faf8f6; font-family: Inter, system-ui, sans-serif; color: #2c2c2c; }

.float-bar { position: sticky; top: 16px; z-index: 50; max-width: 1100px; margin: 0 auto 24px; display: flex; align-items: center; justify-content: space-between; padding: 10px 18px; background: rgba(255,255,255,0.85); backdrop-filter: blur(16px); border: 1px solid #e8e3df; border-radius: 16px; }
.back-btn { background: none; border: none; color: #b08989; font-size: 13px; font-weight: 500; cursor: pointer; }
.back-btn:hover { color: #8b6565; }
.page-title { font-family: 'Playfair Display', serif; font-size: 18px; font-weight: 500; font-style: italic; color: #2c2c2c; }
.submit-btn { padding: 8px 24px; background: #8b6565; border: none; border-radius: 20px; color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.25s; }
.submit-btn:hover:not(:disabled) { background: #7a5555; }
.submit-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.loading-state { display: flex; justify-content: center; padding: 80px 0; }
.loading-ring { width: 36px; height: 36px; border: 3px solid #e8e3df; border-top-color: #b08989; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.editor-layout { display: flex; gap: 32px; max-width: 1100px; margin: 0 auto; padding: 0 24px 60px; }
.editor-main { flex: 1; display: flex; flex-direction: column; gap: 28px; }
.editor-side { width: 260px; flex-shrink: 0; display: flex; flex-direction: column; gap: 18px; }

.block-label { font-size: 11px; color: #555; font-weight: 600; letter-spacing: 0.5px; margin-bottom: 8px; }
.content-textarea { width: 100%; background: #fff; border: 1px solid #e8e3df; border-radius: 12px; color: #2c2c2c; font-family: Inter, system-ui, sans-serif; font-size: 15px; line-height: 1.8; padding: 16px; resize: vertical; outline: none; transition: border-color 0.25s; min-height: 200px; }
.content-textarea:focus { border-color: #b08989; }
.content-textarea::placeholder { color: #bbb; }
.char-count { text-align: right; font-size: 10px; color: #bbb; margin-top: 4px; font-family: 'JetBrains Mono', monospace; }

.media-notice { background: #fff; border: 1px solid #e8e3df; border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 10px; }
.notice-label { font-size: 11px; color: #555; font-weight: 600; }
.notice-text { font-size: 12px; color: #999; }
.existing-grid { display: flex; gap: 6px; flex-wrap: wrap; }
.existing-thumb { width: 56px; height: 56px; border-radius: 8px; overflow: hidden; border: 1px solid #e8e3df; }
.existing-img { width: 100%; height: 100%; object-fit: cover; }
.existing-video-note { font-size: 12px; color: #999; }

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
.tag-input-wrap { display: flex; gap: 4px; } .tag-input-wrap .side-input { flex: 1; }
.tag-add-btn { padding: 9px 14px; background: #8b6565; border: none; border-radius: 8px; color: #fff; font-size: 16px; cursor: pointer; }
.tag-add-btn:hover { background: #7a5555; }
.tag-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
.tag-chip { font-size: 11px; color: #555; padding: 4px 10px; background: #faf8f6; border-radius: 12px; cursor: pointer; transition: all 0.2s; }
.tag-chip:hover { background: rgba(204,68,68,0.06); color: #c44; }
.error-msg { font-size: 12px; color: #c44; padding: 10px 14px; background: rgba(204,68,68,0.06); border-radius: 8px; border-left: 3px solid #c44; }
.success-msg { font-size: 12px; color: #8b6565; padding: 10px 14px; background: rgba(176,137,137,0.08); border-radius: 8px; }

@media (max-width: 800px) { .editor-layout { flex-direction: column; } .editor-side { width: 100%; } }
</style>
