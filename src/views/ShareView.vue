<template>
    <div class="app-shell">
        <div class="paper-texture"></div>

        <!-- 顶栏 -->
        <header class="topbar">
            <div class="brand">
                <span class="brand-lens">◎</span>
                <span class="brand-name">Memoria</span>
            </div>
            <div class="share-badge">分享内容</div>
        </header>

        <!-- 密码输入 -->
        <div class="password-gate" v-if="needPassword">
            <div class="gate-card">
                <div class="gate-icon">🔒</div>
                <h2 class="gate-title">此内容受密码保护</h2>
                <p class="gate-desc">请输入访问密码查看分享内容</p>
                <div class="gate-input-wrap">
                    <input v-model="passwordInput" class="gate-input" type="text" placeholder="输入访问密码" maxlength="10"
                        @keydown.enter="submitPassword" />
                </div>
                <div class="gate-error" v-if="passwordError">{{ passwordError }}</div>
                <button class="gate-btn" @click="submitPassword" :disabled="loading">
                    {{ loading ? '验证中...' : '确认访问' }}
                </button>
            </div>
        </div>

        <!-- 加载中 -->
        <div class="loading-state" v-else-if="loading">
            <div class="loading-dots">
                <span v-for="n in 3" :key="n" class="ldot" :style="{ animationDelay: n * 0.15 + 's' }"></span>
            </div>
            <span class="loading-text">正在加载记忆...</span>
        </div>

        <!-- 错误状态 -->
        <div class="error-state" v-else-if="errorState">
            <div class="error-icon">{{ errorIcon }}</div>
            <h2 class="error-title">{{ errorTitle }}</h2>
            <p class="error-desc">{{ errorDesc }}</p>
        </div>

        <!-- 分享内容 -->
        <div class="share-layout" v-else-if="shareData">

            <!-- 分享信息条 -->
            <div class="share-info-bar">
                <span class="shared-by">{{ shareData.shared_by.username }} 分享了这条记忆</span>
                <span class="expire-info">⏱ 有效至 {{ formatDateTime(shareData.expire_at) }}</span>
            </div>

            <!-- 主内容区 -->
            <div class="content-area">

                <!-- 左侧媒体 -->
                <div class="media-col" v-if="shareData.images?.length > 0 || shareData.video">

                    <!-- 图片画廊 -->
                    <div class="gallery" v-if="shareData.images?.length > 0">
                        <div class="gallery-main" @click="openLightbox(activeIdx)">
                            <img :src="activeImage.url" class="main-img" />
                            <div class="img-overlay">
                                <span class="img-counter">{{ activeIdx + 1 }} / {{ shareData.images.length }}</span>
                                <span class="img-expand">⤢ 查看原图</span>
                            </div>
                        </div>
                        <div class="thumb-row" v-if="shareData.images.length > 1">
                            <div v-for="(img, idx) in shareData.images" :key="idx" class="thumb"
                                :class="{ active: activeIdx === idx }" @click="activeIdx = idx">
                                <img :src="img.url" class="thumb-img" />
                            </div>
                        </div>
                    </div>

                    <!-- 视频 -->
                    <div class="video-block" v-if="shareData.video">
                        <video :src="shareData.video.url" controls class="detail-video"></video>
                    </div>

                </div>

                <!-- 右侧文字 -->
                <div class="text-col">

                    <div class="meta-bar">
                        <span class="meta-mood" v-if="shareData.memory.mood">{{ shareData.memory.mood }}</span>
                        <span class="meta-location" v-if="shareData.memory.location">⌖ {{ shareData.memory.location
                            }}</span>
                        <span class="meta-happened" v-if="shareData.memory.happened_at">
                            ◷ {{ formatDate(shareData.memory.happened_at) }}
                        </span>
                    </div>

                    <div class="content-body" v-if="shareData.memory.content">
                        <p v-for="(para, i) in paragraphs" :key="i" class="content-para">{{ para }}</p>
                    </div>

                    <div class="content-empty" v-else>— 仅有媒体文件 —</div>

                    <div class="tags-section" v-if="shareData.memory.tags?.length > 0">
                        <span class="tag" v-for="t in shareData.memory.tags" :key="t"># {{ t }}</span>
                    </div>

                </div>
            </div>

            <!-- 底部 Memoria 推广 -->
            <div class="promo-bar">
                <span class="promo-text">由 <strong>Memoria</strong> 记录与分享</span>
            </div>

        </div>

        <!-- 灯箱 -->
        <transition name="fade">
            <div class="lightbox" v-if="lightboxOpen" @click.self="lightboxOpen = false">
                <button class="lb-close" @click="lightboxOpen = false">✕</button>
                <button class="lb-prev" @click="prevImage" v-if="shareData.images.length > 1">‹</button>
                <img :src="shareData.images[lightboxIdx].url" class="lb-img" />
                <button class="lb-next" @click="nextImage" v-if="shareData.images.length > 1">›</button>
                <div class="lb-counter">{{ lightboxIdx + 1 }} / {{ shareData.images.length }}</div>
            </div>
        </transition>

    </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const shareData = ref(null)
const loading = ref(false)
const needPassword = ref(false)
const passwordInput = ref('')
const passwordError = ref('')
const errorState = ref(false)
const errorTitle = ref('')
const errorDesc = ref('')
const errorIcon = ref('◎')
const activeIdx = ref(0)
const lightboxOpen = ref(false)
const lightboxIdx = ref(0)

const activeImage = computed(() => shareData.value?.images?.[activeIdx.value] || {})
const paragraphs = computed(() =>
    shareData.value?.memory?.content?.split('\n').filter(p => p.trim()) || []
)

async function fetchShare(password = null) {
    loading.value = true
    passwordError.value = ''
    try {
        const params = password ? `?password=${encodeURIComponent(password)}` : ''
        const resp = await fetch(`/api/v1/s/${route.params.token}${params}`)
        const data = await resp.json()

        if (resp.status === 401 && data.code === 'SHARE_PASSWORD_REQUIRED') {
            needPassword.value = true
            return
        }
        if (resp.status === 401 && data.code === 'INVALID_PASSWORD') {
            passwordError.value = '密码错误，请重试'
            return
        }
        if (resp.status === 404) {
            errorState.value = true
            errorIcon.value = '◎'
            errorTitle.value = '分享链接不存在'
            errorDesc.value = '该链接可能已被删除或从未存在'
            return
        }
        if (resp.status === 410) {
            errorState.value = true
            errorIcon.value = '⏱'
            errorTitle.value = '分享链接已过期'
            errorDesc.value = '该分享链接的有效期已结束'
            return
        }
        if (!resp.ok) {
            errorState.value = true
            errorIcon.value = '⚠'
            errorTitle.value = '访问失败'
            errorDesc.value = '请稍后重试'
            return
        }

        shareData.value = data
        needPassword.value = false
    } catch {
        errorState.value = true
        errorIcon.value = '⚠'
        errorTitle.value = '网络异常'
        errorDesc.value = '请检查网络连接后重试'
    } finally {
        loading.value = false
    }
}

function submitPassword() {
    if (!passwordInput.value.trim()) {
        passwordError.value = '请输入密码'
        return
    }
    fetchShare(passwordInput.value.trim())
}

function openLightbox(idx) {
    lightboxIdx.value = idx
    lightboxOpen.value = true
}
function prevImage() {
    lightboxIdx.value = (lightboxIdx.value - 1 + shareData.value.images.length) % shareData.value.images.length
}
function nextImage() {
    lightboxIdx.value = (lightboxIdx.value + 1) % shareData.value.images.length
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

onMounted(() => fetchShare())
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Noto+Serif+SC:wght@400;500;700&family=Courier+Prime:wght@400;700&display=swap');

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
    font-family: 'Noto Serif SC', serif;
    color: #3a2e1a;
    position: relative;
}

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
    padding: 16px 40px;
    border-bottom: 1px solid #d4c4a8;
    background: rgba(245, 239, 230, 0.92);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    position: sticky;
    top: 0;
    z-index: 10;
}

.brand {
    display: flex;
    align-items: center;
    gap: 8px;
}

.brand-lens {
    font-size: 20px;
    color: #8b6914;
}

.brand-name {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: #3a2e1a;
    letter-spacing: 3px;
    font-style: italic;
}

.share-badge {
    font-size: 10px;
    color: #8b7550;
    letter-spacing: 3px;
    padding: 4px 10px;
    border: 1px solid #d4c4a8;
    border-radius: 1px;
}

/* ── 密码门 ── */
.password-gate {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 57px);
    position: relative;
    z-index: 1;
}

.gate-card {
    background: #fff;
    border: 1px solid #e0d0b8;
    border-radius: 4px;
    padding: 48px 40px;
    width: 380px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    box-shadow: 0 8px 40px rgba(58, 46, 26, 0.1);
}

.gate-icon {
    font-size: 36px;
}

.gate-title {
    font-family: 'Playfair Display', serif;
    font-size: 20px;
    color: #3a2e1a;
    font-weight: 400;
    font-style: italic;
}

.gate-desc {
    font-size: 12px;
    color: #8b7550;
    letter-spacing: 1px;
    text-align: center;
}

.gate-input-wrap {
    width: 100%;
}

.gate-input {
    width: 100%;
    background: #fdf8f0;
    border: 1px solid #d4c4a8;
    border-radius: 2px;
    color: #3a2e1a;
    font-family: 'Courier Prime', monospace;
    font-size: 14px;
    padding: 11px 14px;
    outline: none;
    transition: border-color 0.2s;
    text-align: center;
    letter-spacing: 3px;
}

.gate-input:focus {
    border-color: #8b6914;
}

.gate-input::placeholder {
    color: #c4b48a;
    letter-spacing: 1px;
}

.gate-error {
    font-size: 12px;
    color: #c4704a;
    letter-spacing: 1px;
}

.gate-btn {
    width: 100%;
    padding: 12px;
    background: #8b6914;
    border: none;
    border-radius: 2px;
    color: #f5efe6;
    font-family: 'Noto Serif SC', serif;
    font-size: 14px;
    letter-spacing: 2px;
    cursor: pointer;
    transition: background 0.2s;
}

.gate-btn:hover:not(:disabled) {
    background: #6b5010;
}

.gate-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

/* ── 加载 ── */
.loading-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 120px;
    position: relative;
    z-index: 1;
}

.loading-dots {
    display: flex;
    gap: 8px;
}

.ldot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #c4a87a;
    animation: ldot-pulse 1.2s ease-in-out infinite;
}

@keyframes ldot-pulse {

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

.loading-text {
    font-size: 12px;
    color: #b0966a;
    letter-spacing: 2px;
}

/* ── 错误状态 ── */
.error-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 120px;
    position: relative;
    z-index: 1;
}

.error-icon {
    font-size: 48px;
    color: #d4c4a8;
}

.error-title {
    font-family: 'Playfair Display', serif;
    font-size: 22px;
    color: #8b7550;
    font-style: italic;
}

.error-desc {
    font-size: 13px;
    color: #b0966a;
    letter-spacing: 1px;
}

/* ── 分享信息条 ── */
.share-info-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 40px;
    background: rgba(139, 105, 20, 0.05);
    border-bottom: 1px solid #e0d0b8;
    position: relative;
    z-index: 1;
    flex-wrap: wrap;
    gap: 8px;
}

.shared-by {
    font-size: 13px;
    color: #6b5010;
    letter-spacing: 1px;
}

.expire-info {
    font-size: 11px;
    color: #b0966a;
    font-family: 'Courier Prime', monospace;
    letter-spacing: 1px;
}

/* ── 主内容 ── */
.share-layout {
    position: relative;
    z-index: 1;
}

.content-area {
    display: flex;
    gap: 40px;
    max-width: 1000px;
    margin: 0 auto;
    padding: 40px 40px;
}

.media-col {
    width: 440px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.text-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 20px;
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
    border-radius: 3px;
    cursor: pointer;
    border: 1px solid #e0d0b8;
    aspect-ratio: 4/3;
}

.main-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.4s;
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
    background: linear-gradient(to top, rgba(58, 46, 26, 0.5), transparent);
    display: flex;
    justify-content: space-between;
    opacity: 0;
    transition: opacity 0.25s;
}

.gallery-main:hover .img-overlay {
    opacity: 1;
}

.img-counter {
    font-size: 11px;
    color: rgba(245, 239, 230, 0.9);
    letter-spacing: 2px;
    font-family: 'Courier Prime', monospace;
}

.img-expand {
    font-size: 11px;
    color: rgba(245, 239, 230, 0.7);
}

.thumb-row {
    display: flex;
    gap: 6px;
    overflow-x: auto;
}

.thumb {
    width: 60px;
    height: 60px;
    flex-shrink: 0;
    border-radius: 2px;
    overflow: hidden;
    cursor: pointer;
    border: 1px solid #e0d0b8;
    transition: border-color 0.2s;
}

.thumb.active {
    border-color: #8b6914;
}

.thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
}

.detail-video {
    width: 100%;
    border-radius: 3px;
    border: 1px solid #e0d0b8;
    display: block;
}

/* ── 文字区 ── */
.meta-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    align-items: center;
    padding-bottom: 16px;
    border-bottom: 1px solid #e8dcc8;
}

.meta-mood {
    font-size: 11px;
    color: #8b6914;
    padding: 2px 10px;
    border: 1px solid #e0d0b8;
    border-radius: 1px;
}

.meta-location {
    font-size: 11px;
    color: #8b7550;
}

.meta-happened {
    font-size: 11px;
    color: #8b7550;
}

.content-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.content-para {
    font-size: 15px;
    color: #4a3a20;
    line-height: 1.9;
    letter-spacing: 0.3px;
}

.content-empty {
    font-size: 13px;
    color: #b0966a;
    font-style: italic;
    letter-spacing: 2px;
    padding: 32px 0;
}

.tags-section {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    padding-top: 16px;
    border-top: 1px solid #e8dcc8;
}

.tag {
    font-size: 11px;
    color: #8b7550;
    letter-spacing: 1px;
}

/* ── 底部推广 ── */
.promo-bar {
    text-align: center;
    padding: 24px;
    border-top: 1px solid #e0d0b8;
    margin-top: 20px;
}

.promo-text {
    font-size: 12px;
    color: #b0966a;
    letter-spacing: 2px;
}

.promo-text strong {
    color: #8b6914;
    font-family: 'Playfair Display', serif;
    font-style: italic;
}

/* ── 灯箱 ── */
.lightbox {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(245, 239, 230, 0.96);
    display: flex;
    align-items: center;
    justify-content: center;
}

.lb-img {
    max-width: 90vw;
    max-height: 88vh;
    object-fit: contain;
    border-radius: 2px;
    box-shadow: 0 0 60px rgba(58, 46, 26, 0.15);
}

.lb-close {
    position: absolute;
    top: 20px;
    right: 24px;
    background: none;
    border: 1px solid #d4c4a8;
    border-radius: 50%;
    width: 36px;
    height: 36px;
    color: #8b7550;
    font-size: 14px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s;
}

.lb-close:hover {
    border-color: #8b6914;
    color: #3a2e1a;
}

.lb-prev,
.lb-next {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: rgba(245, 239, 230, 0.9);
    border: 1px solid #d4c4a8;
    border-radius: 1px;
    color: #8b7550;
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
    border-color: #8b6914;
    color: #3a2e1a;
}

.lb-counter {
    position: absolute;
    bottom: 20px;
    font-size: 11px;
    color: #b0966a;
    letter-spacing: 3px;
    font-family: 'Courier Prime', monospace;
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
    .content-area {
        flex-direction: column;
        padding: 20px 16px;
    }

    .media-col {
        width: 100%;
    }

    .share-info-bar {
        padding: 12px 16px;
    }

    .topbar {
        padding: 14px 16px;
    }
}
</style>