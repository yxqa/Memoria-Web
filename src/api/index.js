const BASE_URL = ''

// ───── 基础请求封装 ─────

async function request(path, options = {}) {
  const token = localStorage.getItem('access_token')

  const headers = {
    ...options.headers,
  }

  // 非 FormData 时自动加 Content-Type
  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const resp = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  })

  // 401 清除 token 并跳转登录
  if (resp.status === 401) {
    localStorage.removeItem('access_token')
    window.location.href = '/login'
    return
  }

  // 204 No Content 不解析 JSON
  if (resp.status === 204) {
    return null
  }

  const data = await resp.json()

  if (!resp.ok) {
    // 把后端错误抛出，调用方 catch 处理
    throw { status: resp.status, ...data }
  }

  return data
}

// ───── 5.1 认证 ─────

export const auth = {
  register(username, password) {
    return request('/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },

  login(username, password) {
    return request('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    })
  },

  refresh(refreshToken) {
    return request('/api/v1/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
  },
}

// ───── 5.2 记忆本 ─────

export const books = {
  list() {
    return request('/api/v1/books')
  },

  create(title, coverImage = null) {
    return request('/api/v1/books', {
      method: 'POST',
      body: JSON.stringify({ title, cover_image: coverImage }),
    })
  },

  update(bookId, data) {
    return request(`/api/v1/books/${bookId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  delete(bookId) {
    return request(`/api/v1/books/${bookId}`, {
      method: 'DELETE',
    })
  },
}

// ───── 5.3 记忆 ─────

export const memories = {
  // 获取列表，params 是过滤/分页参数对象
  list(params = {}) {
    const query = new URLSearchParams(
      Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
    ).toString()
    return request(`/api/v1/memories${query ? '?' + query : ''}`)
  },

  // 创建记忆（multipart/form-data）
  create(data, images = [], video = null) {
    const form = new FormData()
    if (data.content)     form.append('content', data.content)
    if (data.mood)        form.append('mood', data.mood)
    if (data.location)    form.append('location', data.location)
    if (data.happened_at) form.append('happened_at', data.happened_at)
    if (data.book_id)     form.append('book_id', data.book_id)
    if (data.tags)        data.tags.forEach(t => form.append('tags', t))
    images.forEach(img => form.append('image', img))
    if (video) form.append('video', video)

    return request('/api/v1/memories', {
      method: 'POST',
      body: form,
    })
  },

  // 获取单条详情
  get(memoryId) {
    return request(`/api/v1/memories/${memoryId}`)
  },

  // 更新记忆（PATCH）
  update(memoryId, data) {
    return request(`/api/v1/memories/${memoryId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  // 删除记忆
  delete(memoryId) {
    return request(`/api/v1/memories/${memoryId}`, {
      method: 'DELETE',
    })
  },

  // 同步标签（全量替换）
  syncTags(memoryId, tags) {
    return request(`/api/v1/memories/${memoryId}/tags`, {
      method: 'POST',
      body: JSON.stringify({ tags }),
    })
  },

  // 移除单个标签
  removeTag(memoryId, tagId) {
    return request(`/api/v1/memories/${memoryId}/tags/${tagId}`, {
      method: 'DELETE',
    })
  },
}

// ───── 5.4 搜索 ─────

export const search = {
  query(q, page = 1, pageSize = 20) {
    const query = new URLSearchParams({ q, page, page_size: pageSize }).toString()
    return request(`/api/v1/search?${query}`)
  },
}

// ───── 5.5 导出 ─────

export const exports_ = {
  create() {
    return request('/api/v1/export', { method: 'POST' })
  },

  status(taskId) {
    return request(`/api/v1/export/${taskId}`)
  },

  // 下载 ZIP（直接返回 blob）
  async download(taskId) {
    const token = localStorage.getItem('access_token')
    const resp = await fetch(`${BASE_URL}/api/v1/export/${taskId}/download`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!resp.ok) throw new Error('下载失败')
    return resp.blob()
  },
}

// ───── 5.6 媒体 ─────

export const media = {
  async getBlobUrl(filename) {
    const resp = await fetch(`${BASE_URL}/api/v1/media/${filename}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('access_token')}`,
      },
    })
    if (!resp.ok) throw new Error('媒体加载失败')
    const blob = await resp.blob()
    return URL.createObjectURL(blob)
  },
}

// ───── 5.7 分享 ─────

export const share = {
  create(memoryId, expireHours = 24, password = null) {
    return request(`/api/v1/memories/${memoryId}/share`, {
      method: 'POST',
      body: JSON.stringify({ expire_hours: expireHours, password }),
    })
  },

  get(token, password = null) {
    return request(`/api/v1/s/${token}`, {
      method: password ? 'POST' : 'GET',
      ...(password && { body: JSON.stringify({ password }) }),
    })
  },
}