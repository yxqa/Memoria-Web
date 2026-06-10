<template>
  <div class="app-shell">
    <div class="paper-texture"></div>

    <!-- 顶栏 -->
    <header class="topbar">
      <button class="back-btn" @click="router.push('/timeline')">← 时间线</button>
      <h1 class="page-title">记忆本</h1>
      <button class="create-btn" @click="openCreate">＋ 新建</button>
    </header>

    <!-- 加载中 -->
    <div class="loading-state" v-if="loading">
      <div class="loading-dots">
        <span v-for="n in 3" :key="n" class="ldot" :style="{ animationDelay: n * 0.15 + 's' }"></span>
      </div>
    </div>

    <!-- 记忆本网格 -->
    <div class="books-area" v-else>

      <div class="books-grid" v-if="books.length > 0">
        <div
          v-for="(book, idx) in books"
          :key="book.id"
          class="book-card"
          :style="{ animationDelay: idx * 0.06 + 's' }"
          @click="goTimeline(book)"
        >
          <!-- 书脊装饰 -->
          <div class="book-spine"></div>

          <!-- 封面内容 -->
          <div class="book-cover">
            <div class="book-top">
              <span class="book-count">{{ book.memory_count }} 条记忆</span>
              <div class="book-actions" @click.stop>
                <button class="book-action-btn" @click="openEdit(book)">编辑</button>
                <button class="book-action-btn danger" @click="openDelete(book)">删除</button>
              </div>
            </div>

            <div class="book-center">
              <div class="book-icon">◫</div>
              <h3 class="book-title">{{ book.title }}</h3>
            </div>

            <div class="book-bottom">
              <span class="book-date">{{ formatDate(book.created_at) }}</span>
              <span class="book-arrow">→</span>
            </div>
          </div>
        </div>

        <!-- 新建占位卡 -->
        <div class="book-card add-card" @click="openCreate">
          <div class="add-inner">
            <span class="add-plus">＋</span>
            <span class="add-label">新建记忆本</span>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <div class="empty-state" v-else>
        <div class="empty-icon">◫</div>
        <p class="empty-title">还没有记忆本</p>
        <p class="empty-sub">创建一个记忆本，把相关的记忆归类整理</p>
        <button class="empty-create-btn" @click="openCreate">新建记忆本</button>
      </div>

    </div>

    <!-- 新建/编辑弹窗 -->
    <transition name="fade">
      <div class="modal-overlay" v-if="showModal" @click.self="closeModal">
        <div class="modal">
          <h3 class="modal-title">{{ editingBook ? '编辑记忆本' : '新建记忆本' }}</h3>

          <div class="modal-field">
            <label class="modal-label">名称</label>
            <input
              v-model="modalForm.title"
              class="modal-input"
              placeholder="给这本记忆起个名字..."
              maxlength="100"
              @keydown.enter="handleModalSubmit"
              ref="titleInputRef"
            />
          </div>

          <div class="modal-field">
            <label class="modal-label">排序</label>
            <input
              v-model.number="modalForm.sort_order"
              class="modal-input"
              type="number"
              placeholder="数字越小越靠前"
              min="0"
            />
          </div>

          <div class="error-msg" v-if="modalError">{{ modalError }}</div>

          <div class="modal-actions">
            <button class="modal-cancel" @click="closeModal">取消</button>
            <button class="modal-confirm" @click="handleModalSubmit" :disabled="modalSubmitting">
              <span v-if="!modalSubmitting">{{ editingBook ? '保存' : '创建' }}</span>
              <span v-else>处理中...</span>
            </button>
          </div>
        </div>
      </div>
    </transition>

    <!-- 删除确认弹窗 -->
    <transition name="fade">
      <div class="modal-overlay" v-if="showDelete" @click.self="showDelete = false">
        <div class="modal">
          <div class="modal-warn-icon">⚠</div>
          <h3 class="modal-title">删除「{{ deletingBook?.title }}」</h3>
          <p class="modal-desc">删除后记忆本中的记忆不会被删除，但会失去归属。</p>
          <div class="modal-actions">
            <button class="modal-cancel" @click="showDelete = false">取消</button>
            <button class="modal-confirm danger" @click="handleDelete" :disabled="deleting">
              {{ deleting ? '删除中...' : '确认删除' }}
            </button>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { books as booksApi } from '../api'

const router = useRouter()

const books = ref([])
const loading = ref(true)
const showModal = ref(false)
const showDelete = ref(false)
const editingBook = ref(null)
const deletingBook = ref(null)
const modalSubmitting = ref(false)
const deleting = ref(false)
const modalError = ref('')
const titleInputRef = ref(null)

const modalForm = ref({ title: '', sort_order: 0 })

async function loadBooks() {
  loading.value = true
  try {
    const data = await booksApi.list()
    books.value = data.items || []
  } catch {
    books.value = []
  } finally {
    loading.value = false
  }
}

function openCreate() {
  editingBook.value = null
  modalForm.value = { title: '', sort_order: 0 }
  modalError.value = ''
  showModal.value = true
  nextTick(() => titleInputRef.value?.focus())
}

function openEdit(book) {
  editingBook.value = book
  modalForm.value = { title: book.title, sort_order: book.sort_order || 0 }
  modalError.value = ''
  showModal.value = true
  nextTick(() => titleInputRef.value?.focus())
}

function openDelete(book) {
  deletingBook.value = book
  showDelete.value = true
}

function closeModal() {
  showModal.value = false
  editingBook.value = null
  modalError.value = ''
}

async function handleModalSubmit() {
  if (!modalForm.value.title.trim()) {
    modalError.value = '请输入记忆本名称'
    return
  }
  modalSubmitting.value = true
  modalError.value = ''
  try {
    if (editingBook.value) {
      await booksApi.update(editingBook.value.id, {
        title: modalForm.value.title,
        sort_order: modalForm.value.sort_order,
      })
    } else {
      await booksApi.create(modalForm.value.title)
    }
    await loadBooks()
    closeModal()
  } catch (e) {
    modalError.value = e.detail || '操作失败，请重试'
  } finally {
    modalSubmitting.value = false
  }
}

async function handleDelete() {
  deleting.value = true
  try {
    await booksApi.delete(deletingBook.value.id)
    await loadBooks()
    showDelete.value = false
  } catch (e) {
    showDelete.value = false
  } finally {
    deleting.value = false
  }
}

function goTimeline(book) {
  router.push({ path: '/timeline', query: { book_id: book.id } })
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
}

onMounted(loadBooks)
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

.paper-texture {
  position: fixed; inset: 0;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E");
  pointer-events: none; z-index: 0; opacity: 0.6;
}

/* ── 顶栏 ── */
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 40px; border-bottom: 1px solid #d4c4a8;
  position: sticky; top: 0;
  background: rgba(245,239,230,0.92);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  z-index: 10;
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

.create-btn {
  padding: 7px 18px; background: #8b6914; border: none;
  border-radius: 2px; color: #f5efe6;
  font-family: 'Noto Serif SC', serif; font-size: 13px;
  letter-spacing: 1px; cursor: pointer; transition: all 0.2s;
}
.create-btn:hover { background: #6b5010; transform: translateY(-1px); }

/* ── 加载 ── */
.loading-state {
  display: flex; justify-content: center; padding: 100px;
}
.loading-dots { display: flex; gap: 8px; align-items: center; }
.ldot {
  width: 8px; height: 8px; border-radius: 50%; background: #c4a87a;
  animation: ldot-pulse 1.2s ease-in-out infinite;
}
@keyframes ldot-pulse { 0%,80%,100%{opacity:0.2;transform:scale(0.8)} 40%{opacity:1;transform:scale(1)} }

/* ── 书架区域 ── */
.books-area {
  max-width: 1000px; margin: 0 auto;
  padding: 40px 40px 60px;
  position: relative; z-index: 1;
}

.books-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 20px;
}

/* ── 书卡 ── */
.book-card {
  height: 260px; border-radius: 3px; overflow: hidden;
  cursor: pointer; position: relative;
  display: flex;
  animation: card-in 0.4s ease both;
  box-shadow: 4px 4px 16px rgba(139,105,20,0.1);
  transition: transform 0.25s, box-shadow 0.25s;
}

@keyframes card-in {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.book-card:hover {
  transform: translateY(-4px) rotate(0.5deg);
  box-shadow: 6px 8px 24px rgba(139,105,20,0.18);
}

/* 书脊 */
.book-spine {
  width: 14px; flex-shrink: 0;
  background: linear-gradient(to bottom, #8b6914, #6b5010);
  border-right: 1px solid rgba(0,0,0,0.1);
}

/* 封面 */
.book-cover {
  flex: 1;
  background: #fff;
  border: 1px solid #e0d0b8; border-left: none;
  border-radius: 0 3px 3px 0;
  padding: 16px;
  display: flex; flex-direction: column; justify-content: space-between;
}

.book-top {
  display: flex; align-items: center; justify-content: space-between;
}

.book-count {
  font-size: 10px; color: #b0966a;
  font-family: 'Courier Prime', monospace; letter-spacing: 1px;
}

.book-actions {
  display: flex; gap: 6px;
  opacity: 0; transition: opacity 0.2s;
}
.book-card:hover .book-actions { opacity: 1; }

.book-action-btn {
  padding: 3px 8px; background: none;
  border: 1px solid #e0d0b8; border-radius: 1px;
  color: #8b7550; font-family: 'Courier Prime', monospace;
  font-size: 10px; letter-spacing: 1px; cursor: pointer;
  transition: all 0.2s;
}
.book-action-btn:hover { border-color: #8b6914; color: #3a2e1a; }
.book-action-btn.danger { color: #c4704a; border-color: #f0d8c8; }
.book-action-btn.danger:hover { border-color: #c4704a; background: rgba(196,112,74,0.06); }

.book-center {
  display: flex; flex-direction: column; align-items: center;
  gap: 12px; padding: 8px 0;
}

.book-icon { font-size: 32px; color: #c4a87a; }

.book-title {
  font-family: 'Playfair Display', serif; font-size: 16px;
  font-weight: 400; color: #3a2e1a; text-align: center;
  line-height: 1.4; word-break: break-all;
}

.book-bottom {
  display: flex; align-items: center; justify-content: space-between;
}

.book-date {
  font-size: 10px; color: #b0966a;
  font-family: 'Courier Prime', monospace; letter-spacing: 1px;
}

.book-arrow {
  font-size: 14px; color: #c4a87a;
  transition: transform 0.2s;
}
.book-card:hover .book-arrow { transform: translateX(3px); color: #8b6914; }

/* ── 新建占位卡 ── */
.add-card {
  border: 1.5px dashed #d4c4a8 !important;
  background: transparent !important;
  box-shadow: none !important;
}
.add-card:hover {
  border-color: #c4a87a !important;
  background: rgba(196,168,122,0.05) !important;
  transform: translateY(-4px) !important;
  box-shadow: none !important;
}

.add-inner {
  width: 100%; height: 100%;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 10px;
}

.add-plus { font-size: 32px; color: #c4a87a; line-height: 1; }
.add-label { font-size: 12px; color: #b0966a; letter-spacing: 2px; }

/* ── 空状态 ── */
.empty-state {
  display: flex; flex-direction: column; align-items: center;
  gap: 14px; padding: 100px 0;
}
.empty-icon { font-size: 48px; color: #d4c4a8; }
.empty-title {
  font-family: 'Playfair Display', serif; font-size: 20px;
  color: #8b7550; font-style: italic;
}
.empty-sub { font-size: 12px; color: #b0966a; letter-spacing: 1px; }
.empty-create-btn {
  margin-top: 8px; padding: 10px 28px;
  background: none; border: 1.5px solid #c4a87a; border-radius: 2px;
  color: #8b6914; font-family: 'Noto Serif SC', serif;
  font-size: 13px; letter-spacing: 2px; cursor: pointer; transition: all 0.25s;
}
.empty-create-btn:hover { background: #8b6914; color: #f5efe6; }

/* ── 弹窗 ── */
.modal-overlay {
  position: fixed; inset: 0; z-index: 100;
  background: rgba(58,46,26,0.4);
  display: flex; align-items: center; justify-content: center;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}

.modal {
  background: #fdf8f0; border: 1px solid #d4c4a8; border-radius: 4px;
  padding: 36px; width: 380px;
  display: flex; flex-direction: column; gap: 16px;
  box-shadow: 0 20px 60px rgba(58,46,26,0.15);
}

.modal-warn-icon { font-size: 28px; color: #c4704a; text-align: center; }

.modal-title {
  font-family: 'Playfair Display', serif; font-size: 18px;
  color: #3a2e1a; font-weight: 400; text-align: center;
}

.modal-desc { font-size: 12px; color: #8b7550; text-align: center; line-height: 1.6; letter-spacing: 0.5px; }

.modal-field { display: flex; flex-direction: column; gap: 6px; }

.modal-label { font-size: 10px; color: #8b7550; letter-spacing: 3px; text-transform: uppercase; }

.modal-input {
  width: 100%; background: #fff; border: 1px solid #d4c4a8;
  border-radius: 2px; color: #3a2e1a;
  font-family: 'Noto Serif SC', serif; font-size: 14px;
  padding: 10px 12px; outline: none; transition: border-color 0.2s;
}
.modal-input:focus { border-color: #8b6914; }
.modal-input::placeholder { color: #c4b48a; }

.error-msg {
  font-size: 12px; color: #c4704a; padding: 8px 12px;
  background: rgba(196,112,74,0.08); border-left: 2px solid #c4704a;
  border-radius: 1px;
}

.modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 4px; }

.modal-cancel {
  padding: 8px 20px; background: none;
  border: 1px solid #d4c4a8; border-radius: 2px;
  color: #8b7550; font-family: 'Noto Serif SC', serif;
  font-size: 13px; cursor: pointer; transition: all 0.2s;
}
.modal-cancel:hover { border-color: #8b6914; color: #3a2e1a; }

.modal-confirm {
  padding: 8px 20px; background: #8b6914; border: none;
  border-radius: 2px; color: #f5efe6;
  font-family: 'Noto Serif SC', serif; font-size: 13px;
  cursor: pointer; transition: all 0.2s;
}
.modal-confirm:hover:not(:disabled) { background: #6b5010; }
.modal-confirm:disabled { opacity: 0.5; cursor: not-allowed; }
.modal-confirm.danger { background: none; border: 1px solid #c4704a; color: #c4704a; }
.modal-confirm.danger:hover:not(:disabled) { background: rgba(196,112,74,0.1); }

/* ── 过渡 ── */
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ── 响应式 ── */
@media (max-width: 600px) {
  .books-area { padding: 24px 16px; }
  .topbar { padding: 14px 16px; }
  .books-grid { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .book-card { height: 220px; }
  .modal { width: calc(100vw - 40px); padding: 24px; }
}
</style>