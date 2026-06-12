<template>
    <div class="app-shell">
        <header class="float-bar">
            <button class="back-btn" @click="router.push('/timeline')">← 返回</button>
            <div class="topbar-actions" v-if="memory">
                <button class="action-btn" @click="openShare">分享</button>
                <button class="action-btn" @click="goEdit">编辑</button>
                <button class="action-btn danger" @click="confirmDelete = true">删除</button>
            </div>
        </header>

        <div class="loading-state" v-if="loading">
            <div class="loading-ring"></div>
        </div>

        <div class="detail-layout" v-else-if="memory" v-motion :initial="{ opacity: 0 }"
            :enter="{ opacity: 1, transition: { duration: 400 } }">
            <div class="media-col" v-if="memory.images?.length > 0 || memory.video">
                <div class="gallery" v-if="memory.images?.length > 0">
                    <div class="gallery-main" @click="openLightbox(activeImageIdx)">
                        <img :src="activeImage.url" class="main-img" />
                        <div class="img-overlay"><span>{{ activeImageIdx + 1 }}/{{ memory.images.length
                        }}</span><span>⤢</span></div>
                    </div>
                    <div class="thumb-row" v-if="memory.images.length > 1">
                        <div v-for="(img, idx) in memory.images" :key="img.id" class="thumb"
                            :class="{ active: activeImageIdx === idx }" @click="activeImageIdx = idx">
                            <img :src="img.url" class="thumb-img" />
                        </div>
                    </div>
                </div>
                <div class="video-block" v-if="memory.video">
                    <div class="block-label">视频</div>
                    <video :src="memory.video.url" controls class="detail-video"></video>
                </div>
            </div>

            <div class="content-col">
                <div class="meta-bar">
                    <span class="meta-date">{{ formatDate(memory.created_at) }}</span>
                    <span class="meta-mood" v-if="memory.mood">{{ memory.mood }}</span>
                    <span class="meta-loc" v-if="memory.location">⌖ {{ memory.location }}</span>
                    <span class="meta-happened" v-if="memory.happened_at">◷ {{ formatDate(memory.happened_at) }}</span>
                </div>
                <div class="book-badge" v-if="memory.book_title"><span>◫</span><span>{{ memory.book_title }}</span>
                </div>
                <div class="content-body" v-if="memory.content">
                    <p v-for="(para, i) in paragraphs" :key="i" class="content-para">{{ para }}</p>
                </div>
                <div class="content-empty" v-else>— 仅有媒体文件 —</div>
                <div class="tags-section" v-if="memory.tags?.length > 0"><span class="tag" v-for="t in memory.tags"
                        :key="t"># {{ t }}</span></div>
                <div class="timestamps"><span>创建于 {{ formatDateTime(memory.created_at) }}</span><span
                        v-if="memory.updated_at !== memory.created_at">· 更新于 {{ formatDateTime(memory.updated_at)
                        }}</span></div>
            </div>
        </div>

        <div class="not-found" v-else>
            <div class="not-found-icon">◎</div>
            <p>记忆不存在或已删除</p><button class="back-link" @click="router.push('/timeline')">返回时间线</button>
        </div>

        <transition name="fade">
            <div class="lightbox" v-if="lightboxOpen" @click.self="lightboxOpen = false"><button class="lb-close"
                    @click="lightboxOpen = false">✕</button><button class="lb-prev" @click="prevImage"
                    v-if="memory.images.length > 1">‹</button><img :src="memory.images[lightboxIdx].url"
                    class="lb-img" /><button class="lb-next" @click="nextImage"
                    v-if="memory.images.length > 1">›</button>
                <div class="lb-counter">{{ lightboxIdx + 1 }}/{{ memory.images.length }}</div>
            </div>
        </transition>

        <transition name="fade">
            <div class="modal-overlay" v-if="confirmDelete" @click.self="confirmDelete = false">
                <div class="modal" v-motion :initial="{ opacity: 0, scale: 0.95 }" :enter="{ opacity: 1, scale: 1 }">
                    <div class="modal-icon">⚠</div>
                    <h3 class="modal-title">确认删除</h3>
                    <p class="modal-desc">删除后将无法恢复，包括所有关联的媒体文件。</p>
                    <div class="modal-actions"><button class="modal-cancel"
                            @click="confirmDelete = false">取消</button><button class="modal-confirm"
                            @click="handleDelete" :disabled="deleting">{{ deleting ? '删除中...' : '确认删除' }}</button></div>
                </div>
            </div>
        </transition>

        <transition name="fade">
            <div class="modal-overlay" v-if="showShare" @click.self="closeShare">
                <div class="modal share-modal" v-motion :initial="{ opacity: 0, scale: 0.95, y: 10 }"
                    :enter="{ opacity: 1, scale: 1, y: 0 }">
                    <template v-if="!shareResult">
                        <h3 class="modal-title">分享这条记忆</h3>
                        <div class="share-field"><label class="share-label">有效期</label>
                            <div class="expire-options"><button v-for="opt in expireOptions" :key="opt.value"
                                    class="expire-btn" :class="{ active: shareForm.expire_hours === opt.value }"
                                    @click="shareForm.expire_hours = opt.value">{{ opt.label }}</button></div>
                        </div>
                        <div class="share-field"><label class="share-label">访问密码 <span
                                    class="share-hint">（可选，4~10位）</span></label><input v-model="shareForm.password"
                                class="share-input" type="text" placeholder="不设置则任何人可访问" maxlength="10" /></div>
                        <div class="share-error" v-if="shareError">{{ shareError }}</div>
                        <div class="modal-actions"><button class="modal-cancel" @click="closeShare">取消</button><button
                                class="modal-confirm" @click="handleShare" :disabled="sharing">{{ sharing ? '生成中...' :
                                    '生成链接' }}</button></div>
                    </template>
                    <template v-else>
                        <div class="share-success-icon">✓</div>
                        <h3 class="modal-title">分享链接已生成</h3>
                        <div class="share-url-box"><span class="share-url-text">{{ shareResult.share_url
                        }}</span><button class="copy-btn" @click="copyUrl">{{ copied ? '已复制' : '复制' }}</button>
                        </div>
                        <div class="share-meta"><span v-if="shareResult.has_password">🔒 已设置密码</span><span>⏱ 有效期至 {{
                            formatDateTime(shareResult.expire_at) }}</span></div>
                        <div class="modal-actions"><button class="modal-confirm" @click="closeShare">完成</button></div>
                    </template>
                </div>
            </div>
        </transition>
    </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { memories as memoriesApi, media as mediaApi, share } from '../api'

const router = useRouter(); const route = useRoute()
const memory = ref(null); const loading = ref(true); const confirmDelete = ref(false); const deleting = ref(false)
const activeImageIdx = ref(0); const lightboxOpen = ref(false); const lightboxIdx = ref(0)
const showShare = ref(false); const sharing = ref(false); const shareResult = ref(null); const shareError = ref(''); const copied = ref(false)
const shareForm = ref({ expire_hours: 24, password: '' })
const expireOptions = [{ label: '1小时', value: 1 }, { label: '24小时', value: 24 }, { label: '48小时', value: 48 }]
const blobUrls = ref([])

function openShare() { shareResult.value = null; shareError.value = ''; shareForm.value = { expire_hours: 24, password: '' }; showShare.value = true }
function closeShare() { showShare.value = false; shareResult.value = null; copied.value = false }

async function loadMemory() {
    loading.value = true
    try {
        const data = await memoriesApi.get(route.params.id)
        // console.log('memory data:', JSON.stringify(data, null, 2))  // ← 加这里

        // 把 images 的 url 替换成 blob URL
        if (data.images?.length) {
            data.images = await Promise.all(
                data.images.map(async (img) => {
                    const filename = img.url.split('/').pop()  // 从 URL 中提取文件名
                    const blobUrl = await mediaApi.getBlobUrl(filename)
                    blobUrls.value.push(blobUrl)
                    return { ...img, url: blobUrl }
                })
            )
        }

        // 视频同理
        if (data.video) {
            const filename = data.video.url.split('/').pop()  // 从 URL 中提取文件名
            const blobUrl = await mediaApi.getBlobUrl(filename)
            blobUrls.value.push(blobUrl)
            data.video = { ...data.video, url: blobUrl }
        }

        memory.value = data
    } catch (e) {
        memory.value = null
        console.error('loadMemory error:', e)  // ← 加这行
    } finally {
        loading.value = false
    }
}

async function handleShare() {
    shareError.value = ''
    if (shareForm.value.password && shareForm.value.password.length < 4) { shareError.value = '密码至少4位'; return }
    sharing.value = true
    try {
        const payload = { expire_hours: shareForm.value.expire_hours }
        if (shareForm.value.password) payload.password = shareForm.value.password
        const data = await share.create(route.params.id, payload.expire_hours, payload.password || null)
        data.share_url = window.location.origin + '/share/' + data.token
        shareResult.value = data
    } catch (e) { shareError.value = e.detail || '生成失败，请重试' }
    finally { sharing.value = false }
}

async function copyUrl() { try { await navigator.clipboard.writeText(shareResult.value.share_url); copied.value = true; setTimeout(() => { copied.value = false }, 2000) } catch { copied.value = false } }

const activeImage = computed(() => memory.value?.images?.[activeImageIdx.value] || {})
const paragraphs = computed(() => memory.value?.content?.split('\n').filter(p => p.trim()) || [])

async function handleDelete() { deleting.value = true; try { await memoriesApi.delete(route.params.id); router.push('/timeline') } catch { confirmDelete.value = false } finally { deleting.value = false } }
function goEdit() { router.push(`/memories/${route.params.id}/edit`) }
function openLightbox(idx) { lightboxIdx.value = idx; lightboxOpen.value = true }
function prevImage() { lightboxIdx.value = (lightboxIdx.value - 1 + memory.value.images.length) % memory.value.images.length }
function nextImage() { lightboxIdx.value = (lightboxIdx.value + 1) % memory.value.images.length }
function formatDate(iso) { if (!iso) return ''; const d = new Date(iso); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}` }
function formatDateTime(iso) { if (!iso) return ''; return `${formatDate(iso)} ${String(new Date(iso).getHours()).padStart(2, '0')}:${String(new Date(iso).getMinutes()).padStart(2, '0')}` }
onMounted(loadMemory)
</script>

<style scoped>
.app-shell {
    min-height: 100vh;
    background: #faf8f6;
    font-family: Inter, system-ui, sans-serif;
    color: #2c2c2c;
}

.float-bar {
    position: sticky;
    top: 16px;
    z-index: 50;
    max-width: 1100px;
    margin: 0 auto 24px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 18px;
    background: rgba(255, 255, 255, 0.85);
    backdrop-filter: blur(16px);
    border: 1px solid #e8e3df;
    border-radius: 16px;
}

.back-btn {
    background: none;
    border: none;
    color: #b08989;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
}

.back-btn:hover {
    color: #8b6565;
}

.topbar-actions {
    display: flex;
    gap: 8px;
}

.action-btn {
    padding: 7px 16px;
    background: none;
    border: 1px solid #e8e3df;
    border-radius: 8px;
    color: #555;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
}

.action-btn:hover {
    border-color: #b08989;
    color: #8b6565;
}

.action-btn.danger {
    color: #c44;
    border-color: #c44;
}

.action-btn.danger:hover {
    background: rgba(204, 68, 68, 0.06);
}

.loading-state {
    display: flex;
    justify-content: center;
    padding: 100px 0;
}

.loading-ring {
    width: 36px;
    height: 36px;
    border: 3px solid #e8e3df;
    border-top-color: #b08989;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

.detail-layout {
    display: flex;
    gap: 40px;
    max-width: 1100px;
    margin: 0 auto;
    padding: 0 24px 60px;
}

.media-col {
    width: 520px;
    flex-shrink: 0;
}

.gallery-main {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
}

.main-img {
    width: 100%;
    height: 360px;
    object-fit: cover;
    display: block;
}

.img-overlay {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 12px 16px;
    background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
    display: flex;
    justify-content: space-between;
    color: #fff;
    font-size: 12px;
    font-family: 'JetBrains Mono', monospace;
    opacity: 0;
    transition: opacity 0.2s;
}

.gallery-main:hover .img-overlay {
    opacity: 1;
}

.thumb-row {
    display: flex;
    gap: 6px;
    margin-top: 8px;
}

.thumb {
    width: 60px;
    height: 60px;
    border-radius: 8px;
    overflow: hidden;
    cursor: pointer;
    opacity: 0.5;
    border: 2px solid transparent;
    transition: all 0.2s;
}

.thumb.active {
    opacity: 1;
    border-color: #b08989;
}

.thumb-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.video-block {
    margin-top: 24px;
}

.block-label {
    font-size: 11px;
    color: #999;
    font-weight: 600;
    margin-bottom: 8px;
}

.detail-video {
    width: 100%;
    border-radius: 12px;
}

.content-col {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 18px;
    min-width: 0;
}

.meta-bar {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
}

.meta-date {
    font-size: 13px;
    color: #bbb;
    font-family: 'JetBrains Mono', monospace;
}

.meta-mood {
    font-size: 12px;
    color: #8b6565;
    padding: 2px 10px;
    background: rgba(176, 137, 137, 0.08);
    border-radius: 10px;
}

.meta-loc,
.meta-happened {
    font-size: 12px;
    color: #999;
}

.book-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    background: rgba(176, 137, 137, 0.08);
    border-radius: 8px;
    font-size: 12px;
    color: #8b6565;
    width: fit-content;
}

.content-body {
    display: flex;
    flex-direction: column;
    gap: 14px;
}

.content-para {
    font-size: 16px;
    color: #2c2c2c;
    line-height: 2;
}

.content-empty {
    font-size: 13px;
    color: #bbb;
    font-style: italic;
    padding: 40px 0;
}

.tags-section {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
}

.tag {
    font-size: 11px;
    color: #999;
    padding: 4px 12px;
    background: #faf8f6;
    border-radius: 12px;
}

.timestamps {
    display: flex;
    gap: 8px;
    font-size: 11px;
    color: #bbb;
    font-family: 'JetBrains Mono', monospace;
    padding-top: 16px;
    border-top: 1px solid #e8e3df;
    margin-top: 8px;
}

.not-found {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    padding: 120px 0;
}

.not-found-icon {
    font-size: 48px;
    color: #e8e3df;
}

.back-link {
    color: #8b6565;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
}

.lightbox {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.94);
    display: flex;
    align-items: center;
    justify-content: center;
}

.lb-img {
    max-width: 90vw;
    max-height: 85vh;
    object-fit: contain;
    border-radius: 4px;
}

.lb-close {
    position: absolute;
    top: 20px;
    right: 24px;
    background: none;
    border: none;
    color: #fff;
    font-size: 28px;
    cursor: pointer;
}

.lb-prev,
.lb-next {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #fff;
    font-size: 40px;
    cursor: pointer;
    padding: 20px;
}

.lb-prev {
    left: 8px;
}

.lb-next {
    right: 8px;
}

.lb-counter {
    position: absolute;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    color: rgba(255, 255, 255, 0.5);
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
}

.modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0, 0, 0, 0.15);
    backdrop-filter: blur(4px);
    display: flex;
    align-items: center;
    justify-content: center;
}

.modal {
    background: #fff;
    border: 1px solid #e8e3df;
    border-radius: 16px;
    padding: 36px;
    width: 400px;
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
}

.modal-icon {
    font-size: 28px;
    color: #c44;
    text-align: center;
}

.modal-title {
    font-family: 'Playfair Display', serif;
    font-size: 18px;
    color: #2c2c2c;
    font-weight: 500;
    text-align: center;
}

.modal-desc {
    font-size: 13px;
    color: #999;
    text-align: center;
    line-height: 1.6;
}

.modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
}

.modal-cancel {
    padding: 9px 20px;
    background: none;
    border: 1px solid #e8e3df;
    border-radius: 8px;
    color: #999;
    font-size: 13px;
    cursor: pointer;
}

.modal-cancel:hover {
    border-color: #b08989;
    color: #2c2c2c;
}

.modal-confirm {
    padding: 9px 24px;
    background: #8b6565;
    border: none;
    border-radius: 8px;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
}

.modal-confirm:hover:not(:disabled) {
    background: #7a5555;
}

.modal-confirm:disabled {
    opacity: 0.5;
    cursor: not-allowed;
}

.share-modal {
    width: 400px;
}

.share-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.share-label {
    font-size: 11px;
    color: #555;
    font-weight: 600;
}

.share-hint {
    font-weight: 400;
    color: #999;
    font-size: 10px;
}

.expire-options {
    display: flex;
    gap: 6px;
}

.expire-btn {
    padding: 6px 14px;
    background: #faf8f6;
    border: 1px solid #e8e3df;
    border-radius: 16px;
    color: #999;
    font-size: 12px;
    cursor: pointer;
    transition: all 0.2s;
}

.expire-btn.active {
    border-color: #b08989;
    background: rgba(176, 137, 137, 0.08);
    color: #8b6565;
}

.share-input {
    width: 100%;
    background: #faf8f6;
    border: 1px solid #e8e3df;
    border-radius: 8px;
    color: #2c2c2c;
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    padding: 10px 12px;
    outline: none;
}

.share-input:focus {
    border-color: #b08989;
}

.share-error {
    font-size: 12px;
    color: #c44;
}

.share-success-icon {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #8b6565;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    margin: 0 auto;
}

.share-url-box {
    display: flex;
    gap: 8px;
    background: #faf8f6;
    border: 1px solid #e8e3df;
    border-radius: 8px;
    padding: 10px 14px;
}

.share-url-text {
    flex: 1;
    font-size: 11px;
    color: #555;
    font-family: 'JetBrains Mono', monospace;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.copy-btn {
    padding: 4px 12px;
    background: #8b6565;
    border: none;
    border-radius: 4px;
    color: #fff;
    font-size: 11px;
    cursor: pointer;
}

.share-meta {
    display: flex;
    gap: 12px;
    font-size: 11px;
    color: #999;
    justify-content: center;
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}

@media (max-width: 800px) {
    .detail-layout {
        flex-direction: column;
    }

    .media-col {
        width: 100%;
    }

    .main-img {
        height: 260px;
    }
}
</style>
