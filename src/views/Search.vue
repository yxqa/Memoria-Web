<template>
  <div class="app-shell">
    <header class="float-bar">
      <button class="back-btn" @click="router.push('/timeline')">← 返回</button>
      <div class="search-box">
        <span class="search-icon">⌕</span>
        <input v-model="query" class="search-input" placeholder="搜索记忆..." @keydown.enter="handleSearch" @input="onInput" autofocus />
        <button class="clear-btn" v-if="query" @click="clearSearch">✕</button>
      </div>
      <button class="search-go" @click="handleSearch" :disabled="!query.trim()">搜索</button>
    </header>

    <div class="results-area" v-if="hasSearched">
      <div class="results-meta" v-if="!loading"><template v-if="total > 0">找到 <strong>{{ total }}</strong> 条 <span class="echo">「{{ lastQuery }}」</span></template><span v-else>没有找到</span></div>
      <div class="loading-state" v-if="loading"><div class="loading-ring"></div></div>
      <div class="results-list" v-else-if="results.length > 0">
        <div v-for="(item, idx) in results" :key="item.id" class="result-card" :style="{ animationDelay: idx*0.04+'s' }" @click="goDetail(item.id)">
          <div class="r-body"><div class="r-meta"><span class="r-date">{{ formatDate(item.created_at) }}</span><span class="r-mood" v-if="item.mood">{{ item.mood }}</span></div><p class="r-text" v-if="item.content" v-html="highlight(item.content, lastQuery)"></p><p class="r-empty" v-else>— 仅含媒体 —</p></div>
          <span class="r-arrow">→</span>
        </div>
      </div>
      <div class="empty-state" v-else><div class="empty-icon">◎</div><p class="empty-title">没有找到</p></div>
      <div class="pagination" v-if="totalPages > 1"><button class="page-btn" :disabled="page <= 1" @click="changePage(page - 1)">←</button><span class="page-info">{{ page }} / {{ totalPages }}</span><button class="page-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">→</button></div>
    </div>

    <div class="initial-state" v-else>
      <div class="initial-grid"><div v-for="tip in searchTips" :key="tip.label" class="initial-card" @click="quickSearch(tip.value)"><span class="tip-emoji">{{ tip.icon }}</span><span class="tip-label">{{ tip.label }}</span></div></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { search as searchApi } from '../api'
const router = useRouter()
const query = ref(''); const lastQuery = ref(''); const results = ref([]); const loading = ref(false); const hasSearched = ref(false); const total = ref(0); const totalPages = ref(1); const page = ref(1)
const searchTips = [{ icon: '🌅', label: '旅行', value: '旅行' },{ icon: '😊', label: '开心', value: '开心' },{ icon: '🍜', label: '美食', value: '美食' },{ icon: '👥', label: '朋友', value: '朋友' },{ icon: '🌧', label: '下雨', value: '下雨' },{ icon: '📚', label: '读书', value: '读书' }]
async function handleSearch() { const q = query.value.trim(); if (!q) return; page.value = 1; await doSearch(q) }
async function doSearch(q) { loading.value = true; hasSearched.value = true; lastQuery.value = q; try { const data = await searchApi.query(q, page.value, 20); results.value = data.items || []; total.value = data.total || 0; totalPages.value = data.total_pages || 1 } catch { results.value = []; total.value = 0 } finally { loading.value = false } }
function clearSearch() { query.value = ''; results.value = []; hasSearched.value = false; total.value = 0; page.value = 1 }
function onInput() { if (!query.value.trim()) { hasSearched.value = false; results.value = [] } }
function quickSearch(val) { query.value = val; handleSearch() }
function changePage(p) { page.value = p; doSearch(lastQuery.value); window.scrollTo({ top: 0, behavior: 'smooth' }) }
function goDetail(id) { router.push(`/memories/${id}`) }
function highlight(text, kw) { if (!kw || !text) return text; const e = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); return text.replace(new RegExp(e, 'gi'), m => `<mark class="hl">${m}</mark>`) }
function formatDate(iso) { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}` }
</script>

<style scoped>
.app-shell { min-height: 100vh; background: #faf8f6; font-family: Inter, system-ui, sans-serif; color: #2c2c2c; }
.float-bar {
  position: sticky; top: 16px; z-index: 50; max-width: 700px; margin: 0 auto;
  display: flex; align-items: center; gap: 10px; padding: 8px 14px;
  background: rgba(255,255,255,0.85); backdrop-filter: blur(16px);
  border: 1px solid #e8e3df; border-radius: 16px;
}
.back-btn { background: none; border: none; color: #b08989; font-size: 13px; font-weight: 500; cursor: pointer; white-space: nowrap; }
.back-btn:hover { color: #8b6565; }
.search-box { flex: 1; display: flex; align-items: center; gap: 8px; }
.search-icon { color: #bbb; font-size: 16px; }
.search-input { flex: 1; border: none; outline: none; background: none; font-size: 14px; color: #2c2c2c; font-family: Inter, sans-serif; }
.search-input::placeholder { color: #bbb; }
.clear-btn { background: none; border: none; color: #bbb; cursor: pointer; font-size: 14px; }
.search-go { padding: 6px 16px; background: #8b6565; border: none; border-radius: 20px; color: #fff; font-size: 12px; font-weight: 600; cursor: pointer; white-space: nowrap; }
.search-go:disabled { opacity: 0.3; cursor: not-allowed; }

.results-area { max-width: 700px; margin: 24px auto 0; padding: 0 24px 60px; }
.results-meta { font-size: 13px; color: #999; margin-bottom: 20px; } .results-meta strong { color: #2c2c2c; } .echo { color: #b08989; }

.loading-state { display: flex; justify-content: center; padding: 60px 0; }
.loading-ring { width: 36px; height: 36px; border: 3px solid #e8e3df; border-top-color: #b08989; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.results-list { display: flex; flex-direction: column; gap: 8px; }
.result-card { background: #fff; border: 1px solid #e8e3df; border-radius: 12px; padding: 18px 20px; cursor: pointer; display: flex; align-items: center; gap: 16px; transition: all 0.25s; animation: card-in 0.4s ease both; }
@keyframes card-in { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
.result-card:hover { border-color: #b08989; box-shadow: 0 2px 12px rgba(0,0,0,0.04); }
.r-body { flex: 1; }
.r-meta { display: flex; gap: 10px; margin-bottom: 6px; }
.r-date { font-size: 11px; color: #bbb; font-family: 'JetBrains Mono', monospace; }
.r-mood { font-size: 10px; color: #8b6565; padding: 1px 8px; background: rgba(176,137,137,0.08); border-radius: 8px; }
.r-text { font-size: 14px; color: #555; line-height: 1.6; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.r-empty { font-size: 12px; color: #bbb; font-style: italic; }
.r-arrow { color: #bbb; font-size: 16px; transition: all 0.2s; }
.result-card:hover .r-arrow { transform: translateX(4px); color: #b08989; }
:deep(.hl) { background: rgba(176,137,137,0.15); color: #8b6565; border-radius: 2px; padding: 0 2px; }

.empty-state { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 80px 0; }
.empty-icon { font-size: 40px; color: #e8e3df; }
.empty-title { font-family: 'Playfair Display', serif; font-size: 18px; color: #999; font-style: italic; }

.initial-state { max-width: 700px; margin: 36px auto 0; padding: 0 24px; }
.initial-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.initial-card { background: #fff; border: 1px solid #e8e3df; border-radius: 12px; padding: 18px 16px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: all 0.2s; }
.initial-card:hover { border-color: #b08989; transform: translateY(-2px); }
.tip-emoji { font-size: 22px; }
.tip-label { font-size: 13px; color: #555; font-weight: 500; }

.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; padding: 40px 0 0; }
.page-btn { padding: 8px 16px; background: none; border: 1px solid #e8e3df; border-radius: 24px; color: #999; font-size: 13px; cursor: pointer; }
.page-btn:hover:not(:disabled) { border-color: #b08989; color: #8b6565; }
.page-btn:disabled { opacity: 0.3; }
.page-info { font-size: 12px; color: #bbb; font-family: 'JetBrains Mono', monospace; }
</style>