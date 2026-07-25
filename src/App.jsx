import { useEffect, useMemo, useState } from 'react'
import { getUsers, toggleBanUser } from './api/adminApi'
import './App.css'

const demoUsers = [
  {
    id: 1,
    username: 'store_admin',
    email: 'admin@example.com',
    full_name: 'Администратор магазина',
    phone: '+380 67 000 00 01',
    role_name: 'Admin',
    is_banned: false,
  },
  {
    id: 2,
    username: 'active_buyer',
    email: 'buyer@example.com',
    full_name: 'Иван Петров',
    phone: '+380 67 000 00 02',
    role_name: 'User',
    is_banned: false,
  },
  {
    id: 3,
    username: 'banned_scammer',
    email: 'scammer@example.com',
    full_name: 'Нарушитель Правил',
    phone: null,
    role_name: 'User',
    is_banned: true,
  },
]

const statusMeta = {
  active: { label: 'Активен', className: 'status-badge status-badge--active' },
  banned: { label: 'Заблокирован', className: 'status-badge status-badge--banned' },
}

function normalizeUsers(payload) {
  const source = Array.isArray(payload) ? payload : payload?.users || payload?.items || []

  return source.map((user, index) => ({
    id: user.id ?? index + 1,
    nickname: user.username ?? `Пользователь ${index + 1}`,
    email: user.email ?? 'почта не указана',
    fullName: user.full_name || 'Имя не указано',
    phone: user.phone || 'не указан',
    role: user.role_name || 'User',
    status: user.is_banned ? 'banned' : 'active',
  }))
}

function App() {
  const [users, setUsers] = useState([])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('all')
  const [isLoading, setIsLoading] = useState(true)
  const [apiMode, setApiMode] = useState('loading')
  const [notice, setNotice] = useState('')
  const [pendingUser, setPendingUser] = useState(null)

  useEffect(() => {
    let ignore = false

    async function loadUsers() {
      try {
        const payload = await getUsers()

        if (!Array.isArray(payload)) {
          throw new Error('Unexpected admin users response')
        }

        if (!ignore) {
          setUsers(normalizeUsers(payload))
          setApiMode('live')
          setNotice('Подключено к API vstore: /api/v1/admin/users.')
        }
      } catch {
        if (!ignore) {
          setUsers(normalizeUsers(demoUsers))
          setApiMode('demo')
          setNotice('API не отвечает — показаны демо-данные для проверки интерфейса.')
        }
      } finally {
        if (!ignore) {
          setIsLoading(false)
        }
      }
    }

    loadUsers()

    return () => {
      ignore = true
    }
  }, [])

  const filteredUsers = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()

    return users.filter((user) => {
      const matchesFilter = filter === 'all' || user.status === filter
      const matchesQuery =
        !normalizedQuery ||
        user.nickname.toLowerCase().includes(normalizedQuery) ||
        user.email.toLowerCase().includes(normalizedQuery) ||
        user.fullName.toLowerCase().includes(normalizedQuery)

      return matchesFilter && matchesQuery
    })
  }, [filter, query, users])

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((user) => user.status === 'active').length,
      banned: users.filter((user) => user.status === 'banned').length,
      staff: users.filter((user) => user.role !== 'User').length,
    }),
    [users],
  )

  async function confirmAction() {
    if (!pendingUser) {
      return
    }

    const nextStatus = pendingUser.status === 'active' ? 'banned' : 'active'

    try {
      let confirmedStatus = nextStatus
      let message = `Демо-режим: статус ${pendingUser.nickname} изменён только на странице.`

      if (apiMode === 'live') {
        const response = await toggleBanUser(pendingUser.id)
        confirmedStatus = response?.is_banned ? 'banned' : 'active'
        message = response?.message || `Статус пользователя ${pendingUser.nickname} обновлён.`
      }

      setUsers((currentUsers) =>
        currentUsers.map((user) => (user.id === pendingUser.id ? { ...user, status: confirmedStatus } : user)),
      )
      setNotice(message)
    } catch {
      setNotice(`Не удалось изменить статус ${pendingUser.nickname}. Проверьте API.`)
    } finally {
      setPendingUser(null)
    }
  }

  return (
    <div className="admin-page">
      <header className="steam-header">
        <div className="steam-header__inner">
          <div>
            <p className="eyebrow">vstore admin</p>
            <h1>Панель администратора</h1>
          </div>
        </div>
      </header>

      <main className="admin-shell">
        <aside className="admin-sidebar">
          <div className="admin-card admin-card--profile">
            <div className="avatar">VS</div>
            <div>
              <strong>VStore Admin</strong>
              <span>Управление пользователями</span>
            </div>
          </div>

          <div className="admin-card">
            <h2>Разделы</h2>
            <button className="sidebar-button sidebar-button--active" type="button">
              Пользователи
            </button>
            <button className="sidebar-button" type="button" disabled>
              Каталог игр
            </button>
          </div>
        </aside>

        <section className="admin-content" id="users">
          <div className={`api-banner api-banner--${apiMode}`}>{notice}</div>

          <section className="stats-grid" id="stats" aria-label="Статистика пользователей">
            <article className="stat-card">
              <span>Всего пользователей</span>
              <strong>{stats.total}</strong>
            </article>
            <article className="stat-card">
              <span>Активны</span>
              <strong>{stats.active}</strong>
            </article>
            <article className="stat-card">
              <span>Заблокированы</span>
              <strong>{stats.banned}</strong>
            </article>
            <article className="stat-card">
              <span>Не User-роли</span>
              <strong>{stats.staff}</strong>
            </article>
          </section>

          <section className="panel">
            <div className="panel__header">
              <div>
                <p className="eyebrow">community control</p>
                <h2>Участники магазина</h2>
              </div>
              <div className="panel-tools">
                <label className="search-field">
                  <span>Поиск</span>
                  <input
                    type="search"
                    placeholder="Ник, email или имя"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <label className="search-field">
                  <span>Статус</span>
                  <select value={filter} onChange={(event) => setFilter(event.target.value)}>
                    <option value="all">Все</option>
                    <option value="active">Активные</option>
                    <option value="banned">Заблокированные</option>
                  </select>
                </label>
              </div>
            </div>

            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Пользователь</th>
                    <th>Телефон</th>
                    <th>Роль</th>
                    <th>Статус</th>
                    <th>ID</th>
                    <th>Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="6" className="table-empty">
                        Загрузка пользователей…
                      </td>
                    </tr>
                  ) : filteredUsers.length ? (
                    filteredUsers.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-cell">
                            <div className="avatar avatar--small">{user.nickname.slice(0, 2).toUpperCase()}</div>
                            <div>
                              <strong>{user.nickname}</strong>
                              <span>
                                {user.fullName} · {user.email}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>{user.phone}</td>
                        <td>{user.role}</td>
                        <td>
                          <span className={statusMeta[user.status].className}>{statusMeta[user.status].label}</span>
                        </td>
                        <td>{user.id}</td>
                        <td>
                          {user.status === 'active' ? (
                            <button className="action-button action-button--ban" type="button" onClick={() => setPendingUser(user)}>
                              Забанить
                            </button>
                          ) : (
                            <button className="action-button action-button--unban" type="button" onClick={() => setPendingUser(user)}>
                              Разбанить
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="table-empty">
                        По текущему фильтру пользователи не найдены.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>

      {pendingUser && (
        <div className="modal-backdrop" role="presentation" onClick={() => setPendingUser(null)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="action-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="eyebrow">{pendingUser.status === 'active' ? 'block user' : 'restore user'}</p>
            <h2 id="action-modal-title">
              {pendingUser.status === 'active' ? 'Заблокировать пользователя?' : 'Снять блокировку?'}
            </h2>
            <p>
              Будет вызван API-маршрут <code>POST /api/v1/admin/users/{pendingUser.id}/toggle-ban</code>.
              {apiMode === 'demo' && ' В демо-режиме изменится только интерфейс.'}
            </p>

            <div className="modal-actions">
              <button className="action-button action-button--ghost" type="button" onClick={() => setPendingUser(null)}>
                Отмена
              </button>
              <button
                className={`action-button ${pendingUser.status === 'active' ? 'action-button--ban' : 'action-button--unban'}`}
                type="button"
                onClick={confirmAction}
              >
                Подтвердить
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

export default App
