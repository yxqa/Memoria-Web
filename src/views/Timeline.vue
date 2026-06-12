<template>
  <div class="app-shell">
    <div class="grain"></div>

    <!-- ───── 侧边岛（悬浮，不占宽度） ───── -->
    <div class="side-island" :class="{ expanded: sidebarOpen }">
      <!-- 遮罩层，点击关闭 -->
      <div class="island-backdrop" v-if="sidebarOpen" @click="sidebarOpen = false"></div>

      <!-- 岛体 -->
      <div class="island-body">
        <!-- 始终可见：品牌 + 快捷图标 -->
        <div class="island-rail">
          <div class="brand-pill" @click="sidebarOpen = !sidebarOpen" :title="sidebarOpen ? '收起' : '展开菜单'">
            <span class="brand-lens">◎</span>
          </div>
          <div class="rail-divider"></div>
          <button class="rail-btn" :class="{ active: activeFilter === 'all' }" @click="setFilter('all'); sidebarOpen = false" title="全部记忆">⊞</button>
          <button class="rail-btn" @click="goSearch" title="搜索">⌕</button>
          <button class="rail-btn" @click="goCreate" title="新记忆">＋</button>
        </div>

        <!-- 展开的毛玻璃面板 -->
        <div class="island-panel" v-show="sidebarOpen">
          <div class="panel-header">
            <span class="panel-brand">Memoria</span>
            <div class="panel-user">
              <div class="user-avatar">{{ username.charAt(0).toUpperCase() }}</div>
              <div class="user-meta">
                <span class="user-name">{{ username }}</span>
                <span class="user-stat">{{ totalMemories }} 条记忆</span>
              </div>
            </div>
          </div>

          <nav class="panel-nav">
            <button class="panel-nav-item" :class="{ active: activeFilter === 'all' }"
              @click="setFilter('all'); sidebarOpen = false">
              <span class="nav-icon">⊞</span>全部记忆
            </button>
            <button class="panel-nav-item" :class="{ active: activeFilter === 'book' && !selectedBook }"
              @click="setFilter('book'); sidebarOpen = false">
              <span class="nav-icon">◫</span>记忆本
            </button>

            <div class="book-list" v-if="books.length">
              <button v-for="book in books" :key="book.id" class="book-item"
                :class="{ active: selectedBook === book.id }"
                @click="selectBook(book); sidebarOpen = false">
                <span class="book-dot"></span>
                <span class="book-title">{{ book.title }}</span>
                <span class="book-count">{{ book.memory_count }}</span>
              </button>
            </div>

            <button class="panel-nav-item" @click="router.push('/books'); sidebarOpen = false">
              <span class="nav-icon">⊕</span>管理记忆本
            </button>
            <button class="panel-nav-item" @click="goSearch; sidebarOpen = false">
              <span class="nav-icon">⌕</span>搜索
            </button>
          </nav>

          <div class="panel-footer">
            <button class="logout-btn" @click="logout">退出登录</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ───── 主内容区 ───── -->
    <main class="main">

      <!-- 顶栏 -->
      <header class="topbar">
        <div class="topbar-left">
          <h2 class="page-title">
            {{ pageTitle }}
            <span class="title-count" v-if="total > 0">{{ total }}</span>
          </h2>
        </div>
        <div class="topbar-right">
          <!-- 新建按钮（始终可见） -->
          <button class="create-btn" @click="goCreate">
            <span>＋</span>
            <span class="create-label">新记忆</span>
          </button>
        </div>
      </header>

      <!-- 心情筛选条（独立一行，移动端友好） -->
      <div class="mood-bar">
        <button v-for="m in moods" :key="m.value" class="mood-chip" :class="{ active: activeMood === m.value }"
          @click="setMood(m.value)">{{ m.label }}</button>
      </div>

      <!-- 记忆列表 -->
      <div class="feed" v-if="!loading && memories.length > 0">
        <div v-for="(memory, idx) in memories" :key="memory.id" class="memory-card"
          :style="{ animationDelay: idx * 0.06 + 's' }" @click="goDetail(memory.id)">
          <!-- 时间戳轴 -->
          <div class="card-time-axis">
            <div class="time-dot"></div>
            <div class="time-line" v-if="idx < memories.length - 1"></div>
          </div>

          <!-- 卡片内容 -->
          <div class="card-body">
            <div class="card-meta">
              <span class="card-date">{{ formatDate(memory.created_at) }}</span>
              <span class="card-mood" v-if="memory.mood">{{ memory.mood }}</span>
              <span class="card-location" v-if="memory.location">⌖ {{ memory.location }}</span>
            </div>

            <p class="card-content" v-if="memory.content">{{ truncate(memory.content, 120) }}</p>

            <!-- 媒体预览 -->
            <div class="card-media" v-if="memory.image_count > 0 || memory.has_video">
              <div class="media-badge image-badge" v-if="memory.image_count > 0">
                ⬚ {{ memory.image_count }}张
              </div>
              <div class="media-badge video-badge" v-if="memory.has_video">
                ▷ 视频
              </div>
            </div>

            <!-- 标签 -->
            <div class="card-tags" v-if="memory.tags && memory.tags.length > 0">
              <span class="tag" v-for="t in memory.tags.slice(0, 4)" :key="t"># {{ t }}</span>
              <span class="tag-more" v-if="memory.tags.length > 4">+{{ memory.tags.length - 4 }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else-if="!loading && memories.length === 0">
        <div class="empty-lens">◎</div>
        <p class="empty-title">还没有记忆</p>
        <p class="empty-sub">点击「新记忆」开始记录你的第一条故事</p>
        <button class="empty-create-btn" @click="goCreate">开始记录</button>
      </div>

      <!-- 加载中 -->
      <div class="loading-state" v-else-if="loading">
        <div class="loading-strip">
          <div class="loading-frame" v-for="n in 5" :key="n" :style="{ animationDelay: n * 0.1 + 's' }"></div>
        </div>
      </div>

      <!-- 分页 -->
      <div class="pagination" v-if="totalPages > 1">
        <button class="page-btn" :disabled="page <= 1" @click="changePage(page - 1)">←</button>
        <span class="page-info">{{ page }} / {{ totalPages }}</span>
        <button class="page-btn" :disabled="page >= totalPages" @click="changePage(page + 1)">→</button>
      </div>

    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { memories as memoriesApi, books as booksApi } from '../api'

const router = useRouter()

// ── 状态 ──
const memories = ref([])
const books = ref([])
const loading = ref(false)
const page = ref(1)
const total = ref(0)
const totalPages = ref(1)
const activeFilter = ref('all')
const selectedBook = ref(null)
const activeMood = ref(null)
const totalMemories = ref(0)
const username = ref(localStorage.getItem('username') || 'User')

const moods = [
  { label: '全部', value: null },
  { label: '😊 开心', value: '开心' },
  { label: '😢 难过', value: '难过' },
  { label: '😌 平静', value: '平静' },
  { label: '🤩 兴奋', value: '兴奋' },
  { label: '🙏 感恩', value: '感恩' },
]

const pageTitle = computed(() => {
  if (selectedBook.value) {
    const book = books.value.find(b => b.id === selectedBook.value)
    return book ? book.title : '记忆本'
  }
  return '时间线'
})

// ── 数据加载 ──
async function loadMemories() {
  loading.value = true
  try {
    const params = { page: page.value, page_size: 20 }
    if (selectedBook.value) params.book_id = selectedBook.value
    if (activeMood.value) params.mood = activeMood.value

    const data = await memoriesApi.list(params)
    memories.value = data.items || []
    total.value = data.total || 0
    totalPages.value = data.total_pages || 1
    if (activeFilter.value === 'all' && !activeMood.value) {
      totalMemories.value = data.total || 0
    }
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function loadBooks() {
  try {
    const data = await booksApi.list()
    books.value = data.items || []
  } catch (e) {
    console.error(e)
  }
}

// ── 交互 ──
function setFilter(f) {
  activeFilter.value = f
  selectedBook.value = null
  page.value = 1
  loadMemories()
}

function selectBook(book) {
  activeFilter.value = 'book'
  selectedBook.value = book.id
  page.value = 1
  loadMemories()
}

function setMood(mood) {
  activeMood.value = mood
  page.value = 1
  loadMemories()
}

function changePage(p) {
  page.value = p
  loadMemories()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function goDetail(id) { router.push(`/memories/${id}`) }
function goCreate() { router.push('/memories/create') }
function goSearch() { router.push('/search') }

function logout() {
  localStorage.removeItem('access_token')
  router.push('/login')
}

// ── 工具 ──
function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function truncate(str, n) {
  return str && str.length > n ? str.slice(0, n) + '...' : str
}

const sidebarOpen = ref(false)

onMounted(() => {
  loadMemories()
  loadBooks()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Courier+Prime:wght@400;700&display=swap');

/* ─────────────────────────────────────
   全局重置
───────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

/* ─────────────────────────────────────
   壳体
───────────────────────────────────── */
.app-shell {
  display: flex;
  min-height: 100vh;
  background: #f5efe6;
  font-family: 'Courier Prime', monospace;
  position: relative;
  color: #3a2e1a;
  overflow-x: hidden;
}

.grain {
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
  0%,100%{transform:translate(0,0)} 10%{transform:translate(-2%,-3%)} 20%{transform:translate(3%,2%)}
  30%{transform:translate(-1%,4%)} 40%{transform:translate(4%,-1%)} 50%{transform:translate(-3%,1%)}
  60%{transform:translate(1%,-4%)} 70%{transform:translate(-4%,3%)} 80%{transform:translate(2%,-2%)} 90%{transform:translate(-2%,4%)}
}

/* ─────────────────────────────────────
   悬浮侧边岛
───────────────────────────────────── */
.side-island {
  position: fixed;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 100;
  display: flex;
  align-items: stretch;
}

/* 半透明遮罩 */
.island-backdrop {
  position: fixed;
  inset: 0;
  z-index: -1;
  background: rgba(30, 20, 8, 0.25);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  animation: fade-in 0.2s ease;
}
@keyframes fade-in { from{opacity:0} to{opacity:1} }

/* 岛体容器 */
.island-body {
  display: flex;
  align-items: stretch;
  gap: 0;
}

/* 左侧竖列（始终显示） */
.island-rail {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 10px 6px;
  background: rgba(237, 229, 216, 0.82);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(212, 196, 168, 0.7);
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(58, 46, 26, 0.12);
}

.brand-pill {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 50%;
  transition: background 0.2s;
}
.brand-pill:hover { background: rgba(139, 115, 85, 0.15); }
.brand-lens {
  font-size: 18px;
  color: #8b7355;
  line-height: 1;
}

.rail-divider {
  width: 16px;
  height: 1px;
  background: rgba(139, 115, 85, 0.3);
  margin: 2px 0;
}

.rail-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  color: #6b5a3a;
  cursor: pointer;
  transition: all 0.2s;
}
.rail-btn:hover { background: rgba(139, 115, 85, 0.12); color: #3a2e1a; }
.rail-btn.active { color: #8b6914; background: rgba(139, 105, 20, 0.12); }

/* 展开面板（毛玻璃） */
.island-panel {
  width: 220px;
  margin-left: 8px;
  background: rgba(237, 229, 216, 0.88);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(212, 196, 168, 0.8);
  border-radius: 16px;
  box-shadow: 0 8px 40px rgba(58, 46, 26, 0.16);
  display: flex;
  flex-direction: column;
  padding: 16px 12px;
  gap: 12px;
  animation: panel-slide 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  overflow: hidden;
  max-height: 80vh;
}
@keyframes panel-slide {
  from { opacity: 0; transform: translateX(-12px) scale(0.97); }
  to   { opacity: 1; transform: translateX(0) scale(1); }
}

.panel-header {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(139, 115, 85, 0.2);
}

.panel-brand {
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  color: #6b5a3a;
  letter-spacing: 2px;
  font-style: italic;
}

.panel-user {
  display: flex;
  align-items: center;
  gap: 8px;
}

.user-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: #3a2e1a;
  border: 1px solid #8b7355;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: #c4a882;
  flex-shrink: 0;
}

.user-meta {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-size: 12px;
  color: #3a2e1a;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-stat {
  font-size: 10px;
  color: #6b5a3a;
  letter-spacing: 1px;
}

/* 面板导航 */
.panel-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  flex: 1;
  overflow-y: auto;
}

.panel-nav-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: none;
  border: none;
  border-radius: 8px;
  color: #5a4a2a;
  font-family: 'Courier Prime', monospace;
  font-size: 13px;
  letter-spacing: 0.5px;
  cursor: pointer;
  transition: all 0.18s;
  text-align: left;
  width: 100%;
}
.panel-nav-item:hover { background: rgba(139, 115, 85, 0.1); color: #3a2e1a; }
.panel-nav-item.active { background: rgba(139, 105, 20, 0.12); color: #6b4c00; font-weight: 700; }
.nav-icon { font-size: 15px; flex-shrink: 0; width: 18px; text-align: center; color: #8b7355; }

/* 记忆本列表 */
.book-list {
  padding: 2px 0 2px 24px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.book-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 8px;
  background: none;
  border: none;
  color: #6b5a3a;
  font-family: 'Courier Prime', monospace;
  font-size: 12px;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.18s;
  text-align: left;
  width: 100%;
}
.book-item:hover { color: #3a2e1a; background: rgba(139, 115, 85, 0.08); }
.book-item.active { color: #6b4c00; font-weight: 700; }
.book-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #8b7355;
  flex-shrink: 0;
}
.book-item.active .book-dot { background: #8b6914; }
.book-title { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.book-count { font-size: 10px; color: #8b7355; }

/* 面板底部 */
.panel-footer {
  padding-top: 10px;
  border-top: 1px solid rgba(139, 115, 85, 0.2);
}

.logout-btn {
  width: 100%;
  padding: 7px;
  background: none;
  border: 1px solid rgba(139, 115, 85, 0.4);
  border-radius: 6px;
  color: #6b5a3a;
  font-family: 'Courier Prime', monospace;
  font-size: 11px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
}
.logout-btn:hover { border-color: #c0704a; color: #c0704a; }

/* ─────────────────────────────────────
   主内容区
───────────────────────────────────── */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  overflow-y: auto;
  position: relative;
  z-index: 1;
  /* 让出左侧岛的空间 */
  padding-left: 72px;
}

/* ─────────────────────────────────────
   顶栏
───────────────────────────────────── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 28px 18px 24px;
  border-bottom: 1px solid #d4c4a8;
  position: sticky;
  top: 0;
  background: rgba(245, 239, 230, 0.92);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 5;
  gap: 12px;
}

.page-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  color: #4a3a20;
  font-weight: 400;
  font-style: italic;
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-count {
  font-family: 'Courier Prime', monospace;
  font-size: 11px;
  color: #6b5a3a;
  font-style: normal;
  padding: 2px 8px;
  border: 1px solid #8b7355;
  border-radius: 2px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* ─────────────────────────────────────
   心情筛选条（独立于 topbar）
───────────────────────────────────── */
.mood-bar {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  padding: 10px 24px;
  border-bottom: 1px solid rgba(212, 196, 168, 0.5);
  background: rgba(245, 239, 230, 0.7);
}

.mood-chip {
  padding: 5px 11px;
  background: none;
  border: 1px solid rgba(139, 115, 85, 0.5);
  border-radius: 20px;
  color: #5a4a2a;
  font-family: 'Courier Prime', monospace;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.mood-chip:hover { border-color: #8b7355; color: #3a2e1a; background: rgba(139, 115, 85, 0.08); }
.mood-chip.active {
  border-color: #8b6914;
  color: #fff8ee;
  background: #8b6914;
}

/* ─────────────────────────────────────
   新建按钮
───────────────────────────────────── */
.create-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 8px 14px;
  background: #8b6914;
  border: none;
  border-radius: 2px;
  color: #fff8ee;
  font-family: 'Courier Prime', monospace;
  font-size: 13px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.25s;
  white-space: nowrap;
}
.create-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 16px rgba(139, 105, 20, 0.3); }

/* ─────────────────────────────────────
   记忆流
───────────────────────────────────── */
.feed {
  padding: 28px 28px 28px 40px;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.memory-card {
  display: flex;
  gap: 0;
  cursor: pointer;
  animation: card-in 0.4s ease both;
}
@keyframes card-in {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

/* 时间轴 */
.card-time-axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px;
  flex-shrink: 0;
  padding-top: 6px;
}

.time-dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: #8b7355;
  border: 2px solid #c4a882;
  flex-shrink: 0;
  transition: all 0.2s;
}
.memory-card:hover .time-dot { background: #8b6914; border-color: #e8d5b0; }

.time-line {
  flex: 1;
  width: 1px;
  background: linear-gradient(to bottom, #c4a882, transparent);
  min-height: 24px;
  margin-top: 4px;
}

/* 卡片主体 */
.card-body {
  flex: 1;
  margin-left: 16px;
  margin-bottom: 24px;
  padding: 14px 18px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid #e0d0b8;
  border-radius: 4px;
  transition: all 0.22s;
  position: relative;
  overflow: hidden;
}
.card-body::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, #8b6914, transparent);
  opacity: 0;
  transition: opacity 0.22s;
}
.memory-card:hover .card-body {
  border-color: #c4a882;
  box-shadow: 0 2px 16px rgba(139, 105, 20, 0.1);
  transform: translateX(3px);
}
.memory-card:hover .card-body::before { opacity: 1; }

.card-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}

.card-date {
  font-size: 11px;
  color: #8b7355;
  letter-spacing: 2px;
}

.card-mood {
  font-size: 11px;
  color: #5a4a2a;
  padding: 2px 8px;
  border: 1px solid #c4a882;
  border-radius: 2px;
  background: rgba(196, 168, 130, 0.08);
}

.card-location {
  font-size: 11px;
  color: #6b5a3a;
}

.card-content {
  font-size: 14px;
  color: #4a3a20;
  line-height: 1.75;
  margin-bottom: 10px;
  letter-spacing: 0.3px;
}

/* 媒体标记 */
.card-media {
  display: flex;
  gap: 8px;
  margin-bottom: 10px;
}
.media-badge {
  font-size: 10px;
  letter-spacing: 1px;
  padding: 3px 8px;
  border-radius: 2px;
}
.image-badge {
  color: #4a7a96;
  border: 1px solid #4a7a96;
  background: rgba(74, 122, 150, 0.06);
}
.video-badge {
  color: #7a5a40;
  border: 1px solid #7a5a40;
  background: rgba(122, 90, 64, 0.06);
}

/* 标签 */
.card-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.tag { font-size: 11px; color: #6b5a3a; letter-spacing: 0.5px; }
.tag-more { font-size: 10px; color: #8b7355; }

/* ─────────────────────────────────────
   空状态
───────────────────────────────────── */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 32px;
}
.empty-lens { font-size: 48px; color: #8b7355; animation: lens-breathe 3s ease-in-out infinite; }
@keyframes lens-breathe {
  0%,100%{opacity:0.4} 50%{opacity:0.9}
}
.empty-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  color: #4a3a20;
  font-style: italic;
}
.empty-sub { font-size: 12px; color: #6b5a3a; letter-spacing: 2px; }
.empty-create-btn {
  margin-top: 8px;
  padding: 10px 24px;
  background: none;
  border: 1px solid #8b7355;
  color: #6b5a3a;
  font-family: 'Courier Prime', monospace;
  font-size: 13px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.25s;
  border-radius: 2px;
}
.empty-create-btn:hover { border-color: #8b6914; color: #4a3a20; background: rgba(139, 105, 20, 0.08); }

/* ─────────────────────────────────────
   加载 / 分页
───────────────────────────────────── */
.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px;
}
.loading-strip { display: flex; gap: 4px; }
.loading-frame {
  width: 18px;
  height: 60px;
  background: #c4a882;
  border-radius: 2px;
  animation: frame-pulse 1.2s ease-in-out infinite;
}
@keyframes frame-pulse {
  0%,100%{opacity:0.2;height:30px} 50%{opacity:0.8;height:60px}
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 28px;
  border-top: 1px solid #d4c4a8;
}
.page-btn {
  padding: 7px 16px;
  background: none;
  border: 1px solid #c4a882;
  color: #6b5a3a;
  font-family: 'Courier Prime', monospace;
  font-size: 14px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s;
}
.page-btn:hover:not(:disabled) { border-color: #8b6914; color: #4a3a20; }
.page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.page-info { font-size: 12px; color: #6b5a3a; letter-spacing: 3px; }

/* ─────────────────────────────────────
   移动端响应式
───────────────────────────────────── */
@media (max-width: 640px) {
  /* 岛移到底部中央 */
  .side-island {
    left: 50%;
    top: auto;
    bottom: 16px;
    transform: translateX(-50%);
  }

  /* 竖列变横列 */
  .island-rail {
    flex-direction: row;
    border-radius: 40px;
    padding: 8px 14px;
    gap: 6px;
  }

  .rail-divider {
    width: 1px;
    height: 16px;
    margin: 0 2px;
  }

  /* 展开面板从底部向上弹出 */
  .island-body {
    flex-direction: column-reverse;
    align-items: center;
  }

  .island-panel {
    margin-left: 0;
    margin-bottom: 8px;
    width: 280px;
    max-height: 70vh;
    animation: panel-up 0.22s cubic-bezier(0.34, 1.56, 0.64, 1);
  }
  @keyframes panel-up {
    from { opacity: 0; transform: translateY(16px) scale(0.97); }
    to   { opacity: 1; transform: translateY(0) scale(1); }
  }

  /* main 不再需要为侧边让出空间，改为底部 padding */
  .main {
    padding-left: 0;
    padding-bottom: 72px;
  }

  /* topbar 紧凑化 */
  .topbar {
    padding: 14px 16px;
  }
  .page-title { font-size: 17px; }
  .create-label { display: none; }
  .create-btn { padding: 8px 12px; font-size: 18px; letter-spacing: 0; }

  /* mood bar 横向滚动 */
  .mood-bar {
    padding: 8px 14px;
    flex-wrap: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    gap: 6px;
  }
  .mood-bar::-webkit-scrollbar { display: none; }
  .mood-chip { flex-shrink: 0; }

  /* feed 间距收窄 */
  .feed { padding: 18px 14px 18px 28px; }
  .card-body { padding: 12px 14px; }
  .card-content { font-size: 13px; }
}
/* 修复侧边栏整体圆角 - 统一外边容器圆角 */
.side-island .island-body {
  border-radius: 20px;  /* 整体圆角 */
  overflow: hidden;     /* 裁剪内部溢出，避免方形边角透出 */
  box-shadow: 0 4px 24px rgba(58, 46, 26, 0.12);
}

/* rail 和 panel 自身不再单独设置外圆角，且背景完全一致 */
.island-rail,
.island-panel {
  border-radius: 0 !important;   /* 强制移除各自圆角，由父容器统一控制 */
  background: rgba(237, 229, 216, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(212, 196, 168, 0.7);
}

/* 展开时 panel 和 rail 合并，需要调整边框避免重复 */
.side-island.expanded .island-body {
  box-shadow: 0 12px 40px rgba(58, 46, 26, 0.2);
}

.side-island.expanded .island-rail {
  border-right: none;       /* 合并时去掉中间边框 */
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.side-island.expanded .island-panel {
  border-left: none;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  margin-left: 0;
}

/* 移动端适配：上下合并 */
@media (max-width: 640px) {
  .side-island .island-body {
    border-radius: 20px;
  }

  .side-island.expanded .island-rail {
    border-right: 1px solid rgba(212, 196, 168, 0.7);
    border-bottom: none;
    border-radius: 20px 20px 0 0 !important;
  }

  .side-island.expanded .island-panel {
    border-left: 1px solid rgba(212, 196, 168, 0.7);
    border-top: none;
    border-radius: 0 0 20px 20px !important;
    margin-left: 0;
  }
}

/* 保证 rail 和 panel 背景完全一致（避免透明度差异） */
.side-island.expanded .island-rail,
.side-island.expanded .island-panel {
  background: rgba(237, 229, 216, 0.92);
  backdrop-filter: blur(20px);
}

</style>