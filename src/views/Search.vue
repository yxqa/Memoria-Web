<template>
  <div class="app-shell">
    <div class="paper-texture"></div>

    <!-- 顶栏 -->
    <header class="topbar">
      <button class="back-btn" @click="router.push('/timeline')">← 时间线</button>
      <h1 class="page-title">搜索记忆</h1>
      <div class="topbar-placeholder"></div>
    </header>

    <!-- 搜索框区域 -->
    <div class="search-hero">
      <div class="search-box-wrap">
        <span class="search-icon">⌕</span>
        <input
          v-model="query"
          class="search-input"
          placeholder="输入关键词，搜索你的记忆..."
          @keydown.enter="handleSearch"
          @input="onInput"
          autofocus
        />
        <button class="clear-btn" v-if="query" @click="clearSearch">✕</button>
        <button class="search-btn" @click="handleSearch" :disabled="!query.trim()">搜索</button>
      </div>
      <p class="search-hint" v-if="!hasSearched">支持全文搜索，可搜索内容、心情、位置</p>
    </div>

    <!-- 搜索结果 -->
    <div class="results-area" v-if="hasSearched">

      <!-- 结果统计 -->
      <div class="results-meta" v-if="!loading">
        <span v-if="total > 0">
          找到 <strong>{{ total }}</strong> 条相关记忆
          <span class="query-echo">「{{ lastQuery }}」</span>
        </span>
      </div>

      <!-- 加载中 -->
      <div class="loading-state" v-if="loading">
        <div class="loading-dots">
          <span v-for="n in 3" :key="n" class="ldot" :style="{ animationDelay: n * 0.15 + 's' }"></span>
        </div>
        <span class="loading-text">正在翻阅记忆...</span>
      </div>

      <!-- 结果列表 -->
      <div class="results-list" v-else-if="results.length > 0">
        <div
          v-for="(item, idx) in results"
          :key="item.id"
          class="result-card"
          :style="{ animationDelay: idx * 0.05 + 's' }"
          @click="goDetail(item.id)"
        >
          <div class="relevance-bar">
            <div class="relevance-fill" :style="{ width: relevanceWidth(item.relevance) }"></div>
          </div>
          <div class="result-body">
            <div class="result-meta">
              <span class="result-date">{{ formatDate(item.created_at) }}</span>
              <span class="result-mood" v-if="item.mood">{{ item.mood }}</span>
              <span class="result-score">相关度 {{ (item.relevance * 100).toFixed(0) }}%</span>
            </div>
            <p class="result-content" v-if="item.content" v-html="highlight(item.content, lastQuery)"></p>
            <p class="result-empty" v-else>— 仅含媒体文件 —</p>
          </div>
          <span class="result-arrow">→</span>
        </div>
      </div>

      <!-- 空结果 -->
      <div class="empty-state" v-else>
        <div class="empty-icon">◎</div>
        <p class="empty-title">没有找到相关记忆</p>
        <p class="empty-sub">试试换个关键词，或检查是否有拼写错误</p>
      </div>

      <!-- 分页 -->
      <div class="pagination" v-if="totalPages > 1">
        <button class="page-btn" :disabled="page <= 1" @click="changePage(page - 1)">←</button>
        <span class="page-info">{{ page }} / {{ totalPages }}</span>
        <button class="page-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">→</button>
      </div>

    </div>

    <!-- 初始状态 -->
    <div class="initial-state" v-else>
      <div class="initial-grid">
        <div class="initial-card" v-for="tip in searchTips" :key="tip.label" @click="quickSearch(tip.value)">
          <span class="tip-icon">{{ tip.icon }}</span>
          <span class="tip-label">{{ tip.label }}</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { search as searchApi } from '../api'

const router = useRouter()

const query = ref('')
const lastQuery = ref('')
const results = ref([])
const loading = ref(false)
const hasSearched = ref(false)
const total = ref(0)
const totalPages = ref(1)
const page = ref(1)

const searchTips = [
  { icon: '🌅', label: '旅行', value: '旅行' },
  { icon: '😊', label: '开心', value: '开心' },
  { icon: '🍜', label: '美食', value: '美食' },
  { icon: '👥', label: '朋友', value: '朋友' },
  { icon: '🌧', label: '下雨', value: '下雨' },
  { icon: '📚', label: '读书', value: '读书' },
]

async function handleSearch() {
  const q = query.value.trim()
  if (!q) return
  page.value = 1
  await doSearch(q)
}

async function doSearch(q) {
  loading.value = true
  hasSearched.value = true
  lastQuery.value = q
  try {
    const data = await searchApi.query(q, page.value, 20)
    results.value = data.items || []
    total.value = data.total || 0
    totalPages.value = data.total_pages || 1
  } catch {
    results.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function clearSearch() {
  query.value = ''
  results.value = []
  hasSearched.value = false
  total.value = 0
  page.value = 1
}

function onInput() {
  if (!query.value.trim()) {
    hasSearched.value = false
    results.value = []
  }
}

function quickSearch(val) {
  query.value = val
  handleSearch()
}

function changePage(p) {
  page.value = p
  doSearch(lastQuery.value)
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goDetail(id) {
  router.push(`/memories/${id}`)
}

// 关键词高亮
function highlight(text, kw) {
  if (!kw || !text) return text
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return text.replace(
    new RegExp(escaped, 'gi'),
    match => `<mark class="hl">${match}</mark>`
  )
}

// 相关度条宽度（归一化到最大值）
function relevanceWidth(score) {
  const max = Math.max(...results.value.map(r => r.relevance), 1)
  return Math.max((score / max) * 100, 8) + '%'
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Noto+Serif+SC:wght@400;500;700&family=Courier+Prime:wght@400;700&display=swap');

.app-shell {
  min-height: 100vh;
  background: #f5efe6;
  font-family: 'Noto Serif SC', serif;
  color: #3a2e1a;
  position: relative;
}

/* 纸质纹理 */
.paper-texture {
  position: fixed; inset: 0;
  background-image:
    url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none; z-index: 0; opacity: 0.6;
}

/* ── 顶栏 ── */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 40px; border-bottom: 1px solid #d4c4a8;
  position: sticky; top: 0;
  background: rgba(245,239,230,0.92); backdrop-filter: blur(8px); z-index: 10;
}

.back-btn {
  background: none; border: none; color: #8b6914;
  font-family: 'Courier Prime', monospace; font-size: 12px;
  letter-spacing: 2px; cursor: pointer; transition: color 0.2s;
}
.back-btn:hover { color: #3a2e1a; }

.page-title {
  font-family: 'Playfair Display', serif; font-size: 18px;
  font-weight: 400; font-style: italic; color: #3a2e1a;
}

.topbar-placeholder { width: 80px; }

/* ── 搜索框 ── */
.search-hero {
  max-width: 680px; margin: 56px auto 0;
  padding: 0 32px;
  display: flex; flex-direction: column; align-items: center; gap: 12px;
  position: relative; z-index: 1;
}

.search-box-wrap {
  width: 100%; display: flex; align-items: center; gap: 0;
  background: #fff;
  border: 1.5px solid #c4a87a;
  border-radius: 3px;
  box-shadow: 0 2px 20px rgba(139,105,20,0.08), 0 0 0 4px rgba(196,168,122,0.1);
  transition: box-shadow 0.25s, border-color 0.25s;
  overflow: hidden;
}
.search-box-wrap:focus-within {
  border-color: #8b6914;
  box-shadow: 0 4px 24px rgba(139,105,20,0.14), 0 0 0 4px rgba(139,105,20,0.08);
}

.search-icon { padding: 0 14px; font-size: 18px; color: #c4a87a; flex-shrink: 0; }

.search-input {
  flex: 1; border: none; outline: none; background: none;
  font-family: 'Noto Serif SC', serif; font-size: 15px;
  color: #3a2e1a; padding: 14px 0; letter-spacing: 0.5px;
}
.search-input::placeholder { color: #c4b48a; }

.clear-btn {
  padding: 0 12px; background: none; border: none;
  color: #c4a87a; font-size: 13px; cursor: pointer;
  transition: color 0.2s; flex-shrink: 0;
}
.clear-btn:hover { color: #8b6914; }

.search-btn {
  padding: 14px 24px; background: #8b6914; border: none;
  color: #f5efe6; font-family: 'Noto Serif SC', serif;
  font-size: 14px; letter-spacing: 2px; cursor: pointer;
  transition: background 0.2s; flex-shrink: 0;
}
.search-btn:hover:not(:disabled) { background: #6b5010; }
.search-btn:disabled { opacity: 0.4; cursor: not-allowed; }

.search-hint { font-size: 12px; color: #b0966a; letter-spacing: 1px; }

/* ── 结果区 ── */
.results-area {
  max-width: 680px; margin: 32px auto 0;
  padding: 0 32px 60px;
  position: relative; z-index: 1;
}

.results-meta {
  font-size: 13px; color: #8b7550; letter-spacing: 1px;
  margin-bottom: 20px; padding-bottom: 16px;
  border-bottom: 1px solid #e0d0b8;
}

.results-meta strong { color: #3a2e1a; }
.query-echo { color: #8b6914; margin-left: 4px; }
.no-result-hint { color: #b0966a; }

/* ── 加载 ── */
.loading-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 60px 0;
}
.loading-dots { display: flex; gap: 8px; }
.ldot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #c4a87a;
  animation: ldot-pulse 1.2s ease-in-out infinite;
}
@keyframes ldot-pulse { 0%,80%,100%{opacity:0.2;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }
.loading-text { font-size: 12px; color: #b0966a; letter-spacing: 2px; }

/* ── 结果卡片 ── */
.results-list { display: flex; flex-direction: column; gap: 12px; }

.result-card {
  background: #fff;
  border: 1px solid #e0d0b8;
  border-radius: 3px;
  padding: 18px 20px;
  cursor: pointer;
  transition: all 0.25s;
  position: relative;
  overflow: hidden;
  animation: card-in 0.35s ease both;
  display: flex; align-items: flex-start; gap: 16px;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}

.result-card:hover {
  border-color: #c4a87a;
  box-shadow: 0 4px 20px rgba(139,105,20,0.1);
  transform: translateY(-1px);
}

/* 相关度条 */
.relevance-bar {
  width: 3px; flex-shrink: 0; background: #e0d0b8;
  border-radius: 2px; align-self: stretch; min-height: 40px;
  position: relative; overflow: hidden;
}
.relevance-fill {
  position: absolute; bottom: 0; left: 0; right: 0;
  background: linear-gradient(to top, #8b6914, #c4a87a);
  border-radius: 2px; transition: height 0.6s ease;
  height: 100%;
}

.result-body { flex: 1; display: flex; flex-direction: column; gap: 8px; }

.result-meta {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
}
.result-date { font-size: 11px; color: #b0966a; letter-spacing: 2px; font-family: 'Courier Prime', monospace; }
.result-mood {
  font-size: 10px; color: #8b6914; padding: 1px 8px;
  border: 1px solid #e0d0b8; border-radius: 1px;
}
.result-score { font-size: 10px; color: #c4a87a; margin-left: auto; font-family: 'Courier Prime', monospace; }

.result-content {
  font-size: 14px; color: #4a3a20; line-height: 1.7;
  letter-spacing: 0.3px;
  display: -webkit-box; -webkit-line-clamp: 3;
  -webkit-box-orient: vertical; overflow: hidden;
}

.result-empty { font-size: 12px; color: #b0966a; font-style: italic; }

.result-arrow {
  color: #c4a87a; font-size: 16px; flex-shrink: 0;
  align-self: center; transition: transform 0.2s;
}
.result-card:hover .result-arrow { transform: translateX(4px); color: #8b6914; }

/* 高亮 */
:deep(.hl) {
  background: rgba(139,105,20,0.15);
  color: #6b5010;
  border-radius: 2px;
  padding: 0 2px;
  font-style: normal;
}

/* ── 空状态 ── */
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 80px 0;
}
.empty-icon { font-size: 40px; color: #d4c4a8; }
.empty-title { font-family: 'Playfair Display', serif; font-size: 18px; color: #8b7550; font-style: italic; }
.empty-sub { font-size: 12px; color: #b0966a; letter-spacing: 1px; }

/* ── 初始状态 ── */
.initial-state {
  max-width: 680px; margin: 48px auto 0;
  padding: 0 32px;
  position: relative; z-index: 1;
}

.initial-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px;
}

.initial-card {
  background: #fff; border: 1px solid #e0d0b8; border-radius: 3px;
  padding: 16px; display: flex; align-items: center; gap: 10px;
  cursor: pointer; transition: all 0.2s;
}
.initial-card:hover { border-color: #c4a87a; background: #fdf8f0; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(139,105,20,0.08); }

.tip-icon { font-size: 20px; }
.tip-label { font-size: 13px; color: #6b5a3a; letter-spacing: 1px; }

/* ── 分页 ── */
.pagination {
  display: flex; align-items: center; justify-content: center;
  gap: 20px; padding: 40px 0 0;
}
.page-btn {
  padding: 8px 18px; background: none; border: 1px solid #d4c4a8;
  border-radius: 2px; color: #8b7550;
  font-family: 'Courier Prime', monospace; font-size: 14px;
  cursor: pointer; transition: all 0.2s;
}
.page-btn:hover:not(:disabled) { border-color: #8b6914; color: #3a2e1a; }
.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.page-info { font-size: 12px; color: #b0966a; letter-spacing: 3px; font-family: 'Courier Prime', monospace; }

/* ── 响应式 ── */
@media (max-width: 600px) {
  .search-hero, .results-area, .initial-state { padding: 0 16px; }
  .initial-grid { grid-template-columns: repeat(2, 1fr); }
  .topbar { padding: 14px 16px; }
}
</style>