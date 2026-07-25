import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  timeout: 10000,
})

export const ADMIN_ENDPOINTS = {
  users: '/admin/users',
  toggleBan: (userId) => `/admin/users/${userId}/toggle-ban`,
}

export async function getUsers() {
  const { data } = await api.get(ADMIN_ENDPOINTS.users)
  return data
}

export async function toggleBanUser(userId) {
  const { data } = await api.post(ADMIN_ENDPOINTS.toggleBan(userId))
  return data
}
