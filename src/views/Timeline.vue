<template>
  <div class="app-shell">
    <div class="grain"></div>

    <!-- ───── 侧边栏 ───── -->
    <aside class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-top">
        <div class="brand" @click="sidebarCollapsed = !sidebarCollapsed">
          <div class="brand-lens">◎</div>
          <span class="brand-name" v-show="!sidebarCollapsed">Memoria</span>
        </div>
      </div>

      <nav class="nav">
        <button class="nav-item" :class="{ active: activeFilter === 'all' }" @click="setFilter('all')">
          <span class="nav-icon">⊞</span>
          <span class="nav-label" v-show="!sidebarCollapsed">全部记忆</span>
        </button>
        <button class="nav-item" :class="{ active: activeFilter === 'book' && !selectedBook }"
          @click="setFilter('book')">
          <span class="nav-icon">◫</span>
          <span class="nav-label" v-show="!sidebarCollapsed">记忆本</span>
        </button>


        <!-- 记忆本列表 -->
        <div class="book-list" v-show="!sidebarCollapsed">
          <button v-for="book in books" :key="book.id" class="book-item" :class="{ active: selectedBook === book.id }"
            @click="selectBook(book)">
            <span class="book-dot"></span>
            <span class="book-title">{{ book.title }}</span>
            <span class="book-count">{{ book.memory_count }}</span>
          </button>
        </div>
        
        <button class="nav-item" @click="router.push('/books')">
          <span class="nav-icon">⊕</span>
          <span class="nav-label" v-show="!sidebarCollapsed">管理记忆本</span>
        </button>

        <button class="nav-item" @click="goSearch">
          <span class="nav-icon">⌕</span>
          <span class="nav-label" v-show="!sidebarCollapsed">搜索</span>
        </button>
      </nav>

      <div class="sidebar-bottom" v-show="!sidebarCollapsed">
        <div class="user-info">
          <div class="user-avatar">{{ username.charAt(0).toUpperCase() }}</div>
          <div class="user-meta">
            <span class="user-name">{{ username }}</span>
            <span class="user-stat">{{ totalMemories }} 条记忆</span>
          </div>
        </div>
        <button class="logout-btn" @click="logout">退出</button>
      </div>
    </aside>

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
          <!-- 心情筛选 -->
          <div class="mood-filters">
            <button v-for="m in moods" :key="m.value" class="mood-chip" :class="{ active: activeMood === m.value }"
              @click="setMood(m.value)">{{ m.label }}</button>
          </div>
          <!-- 新建按钮 -->
          <button class="create-btn" @click="goCreate">
            <span>＋</span>
            <span>新记忆</span>
          </button>
        </div>
      </header>

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

const sidebarCollapsed = ref(false)

onMounted(() => {
  loadMemories()
  loadBooks()
})
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

/* ── 壳体 ── */
.app-shell {
  display: flex;
  min-height: 100vh;
  background: #f5efe6;
  font-family: 'Courier Prime', monospace;
  position: relative;
  overflow: hidden;
  color: #3a2e1a;
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
}

/* ── 侧边栏 ── */
.sidebar {
  width: 220px;
  min-height: 100vh;
  background: #ede5d8;
  border-right: 1px solid #d4c4a8;
  display: flex;
  flex-direction: column;
  transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  z-index: 10;
  flex-shrink: 0;
}

.sidebar.collapsed {
  width: 56px;
}

.sidebar-top {
  padding: 20px 16px 12px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  user-select: none;
}

.brand-lens {
  font-size: 22px;
  color: #8b7355;
  flex-shrink: 0;
  line-height: 1;
  transition: color 0.2s;
}

.brand:hover .brand-lens {
  color: #c4a882;
}

.brand-name {
  font-family: 'Playfair Display', serif;
  font-size: 18px;
  color: #e8d5b0;
  letter-spacing: 2px;
  white-space: nowrap;
  overflow: hidden;
}

/* ── 导航 ── */
.nav {
  flex: 1;
  padding: 8px 8px;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow-y: auto;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  background: none;
  border: none;
  border-radius: 2px;
  color: #8b7550;
  font-family: 'Courier Prime', monospace;
  font-size: 13px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  white-space: nowrap;
}

.nav-item:hover {
  color: #c4a882;
  background: rgba(139, 115, 85, 0.08);
}

.nav-item.active {
  color: #3a2e1a;
  background: rgba(139,105,20,0.1);
}

.nav-icon {
  font-size: 16px;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

.nav-label {
  overflow: hidden;
}

/* ── 记忆本列表 ── */
.book-list {
  padding: 4px 0 4px 18px;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.book-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  background: none;
  border: none;
  color: #5a4a2a;
  font-family: 'Courier Prime', monospace;
  font-size: 12px;
  cursor: pointer;
  border-radius: 2px;
  transition: all 0.2s;
  text-align: left;
}

.book-item:hover {
  color: #c4a882;
  background: rgba(139, 115, 85, 0.06);
}

.book-item.active {
  color: #e8d5b0;
}

.book-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #3a2e1a;
  flex-shrink: 0;
  transition: background 0.2s;
}

.book-item.active .book-dot {
  background: #8b7355;
}

.book-title {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.book-count {
  font-size: 10px;
  color: #3a2e1a;
}

/* ── 侧边栏底部 ── */
.sidebar-bottom {
  padding: 16px;
  border-top: 1px solid #2a2015;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.user-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #3a2e1a;
  border: 1px solid #8b7355;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  color: #c4a882;
  flex-shrink: 0;
}

.user-meta {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.user-name {
  font-size: 12px;
  color: #c4a882;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-stat {
  font-size: 10px;
  color: #5a4a2a;
}

.logout-btn {
  width: 100%;
  padding: 7px;
  background: none;
  border: 1px solid #2a2015;
  border-radius: 1px;
  color: #5a4a2a;
  font-family: 'Courier Prime', monospace;
  font-size: 11px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.2s;
}

.logout-btn:hover {
  border-color: #8b7355;
  color: #c4704a;
}

/* ── 主内容 ── */
.main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  overflow-y: auto;
  position: relative;
  z-index: 1;
}

/* ── 顶栏 ── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 32px;
  border-bottom: 1px solid #d4c4a8;
  position: sticky;
  top: 0;
  background: rgba(245,239,230,0.92);
  backdrop-filter: blur(8px);
  z-index: 5;
  gap: 16px;
  flex-wrap: wrap;
  -webkit-backdrop-filter: blur(8px);
}

.page-title {
  font-family: 'Playfair Display', serif;
  font-size: 22px;
  color: #e8d5b0;
  font-weight: 400;
  font-style: italic;
  display: flex;
  align-items: center;
  gap: 10px;
}

.title-count {
  font-family: 'Courier Prime', monospace;
  font-size: 12px;
  color: #6b5a3a;
  font-style: normal;
  padding: 2px 8px;
  border: 1px solid #3a2e1a;
  border-radius: 1px;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

/* ── 心情筛选 ── */
.mood-filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.mood-chip {
  padding: 5px 10px;
  background: none;
  border: 1px solid #2a2015;
  border-radius: 1px;
  color: #5a4a2a;
  font-family: 'Courier Prime', monospace;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.mood-chip:hover {
  border-color: #6b5a3a;
  color: #c4a882;
}

.mood-chip.active {
  border-color: #8b7355;
  color: #e8d5b0;
  background: rgba(139, 115, 85, 0.1);
}

/* ── 新建按钮 ── */
.create-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: #8b6914;
  border: none;
  border-radius: 1px;
  color: #e8d5b0;
  font-family: 'Courier Prime', monospace;
  font-size: 13px;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.25s;
  white-space: nowrap;
}

.create-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(139, 115, 85, 0.3);
}

/* ── 记忆流 ── */
.feed {
  padding: 32px 32px 32px 48px;
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
  from {
    opacity: 0;
    transform: translateY(12px);
  }

  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 时间轴 */
.card-time-axis {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 24px;
  flex-shrink: 0;
  padding-top: 4px;
}

.time-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #3a2e1a;
  border: 2px solid #6b5a3a;
  flex-shrink: 0;
  transition: border-color 0.2s;
}

.memory-card:hover .time-dot {
  border-color: #c4a882;
}

.time-line {
  flex: 1;
  width: 1px;
  background: linear-gradient(to bottom, #3a2e1a, transparent);
  min-height: 24px;
  margin-top: 4px;
}

/* 卡片主体 */
.card-body {
  flex: 1;
  margin-left: 20px;
  margin-bottom: 28px;
  padding: 16px 20px;
  background: #ffffff;
  border: 1px solid #e0d0b8;
  border-radius: 2px;
  transition: all 0.25s;
  position: relative;
  overflow: hidden;
}

.card-body::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 2px;
  background: linear-gradient(to bottom, #8b7355, transparent);
  opacity: 0;
  transition: opacity 0.25s;
}

.memory-card:hover .card-body {
  border-color: #3a2e1a;
  background: #1e1609;
  transform: translateX(3px);
}

.memory-card:hover .card-body::before {
  opacity: 1;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.card-date {
  font-size: 11px;
  color: #6b5a3a;
  letter-spacing: 2px;
}

.card-mood {
  font-size: 11px;
  color: #8b7355;
  padding: 2px 8px;
  border: 1px solid #3a2e1a;
  border-radius: 1px;
}

.card-location {
  font-size: 11px;
  color: #5a4a2a;
}

.card-content {
  font-size: 14px;
  color: #c4a882;
  line-height: 1.7;
  margin-bottom: 10px;
  letter-spacing: 0.5px;
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
  border-radius: 1px;
}

.image-badge {
  color: #5a8aa0;
  border: 1px solid #2a3a4a;
  background: rgba(90, 138, 160, 0.06);
}

.video-badge {
  color: #8a6a50;
  border: 1px solid #3a2a1a;
  background: rgba(138, 106, 80, 0.06);
}

/* 标签 */
.card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.tag {
  font-size: 10px;
  color: #5a4a2a;
  letter-spacing: 1px;
}

.tag-more {
  font-size: 10px;
  color: #3a2e1a;
}

/* ── 空状态 ── */
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  padding: 80px 32px;
}

.empty-lens {
  font-size: 48px;
  color: #3a2e1a;
  animation: lens-breathe 3s ease-in-out infinite;
}

@keyframes lens-breathe {

  0%,
  100% {
    opacity: 0.4;
  }

  50% {
    opacity: 0.8;
  }
}

.empty-title {
  font-family: 'Playfair Display', serif;
  font-size: 20px;
  color: #6b5a3a;
  font-style: italic;
}

.empty-sub {
  font-size: 12px;
  color: #3a2e1a;
  letter-spacing: 2px;
}

.empty-create-btn {
  margin-top: 8px;
  padding: 10px 24px;
  background: none;
  border: 1px solid #6b5a3a;
  color: #8b7355;
  font-family: 'Courier Prime', monospace;
  font-size: 13px;
  letter-spacing: 2px;
  cursor: pointer;
  transition: all 0.25s;
  border-radius: 1px;
}

.empty-create-btn:hover {
  border-color: #c4a882;
  color: #e8d5b0;
  background: rgba(139, 115, 85, 0.08);
}

/* ── 加载状态 ── */
.loading-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px;
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
    height: 30px;
  }

  50% {
    opacity: 0.8;
    height: 60px;
  }
}

/* ── 分页 ── */
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 32px;
  border-top: 1px solid #1a1208;
}

.page-btn {
  padding: 8px 16px;
  background: none;
  border: 1px solid #2a2015;
  color: #6b5a3a;
  font-family: 'Courier Prime', monospace;
  font-size: 14px;
  cursor: pointer;
  border-radius: 1px;
  transition: all 0.2s;
}

.page-btn:hover:not(:disabled) {
  border-color: #8b7355;
  color: #c4a882;
}

.page-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-info {
  font-size: 12px;
  color: #5a4a2a;
  letter-spacing: 3px;
}
</style>