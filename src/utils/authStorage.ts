import { User, Session } from '../types/auth'

const USERS_KEY = 'gs_users'
const SESSION_KEY = 'gs_session'

// btoa da senha padrão do admin — usada para detectar se ainda não trocou
const DEFAULT_ADMIN_HASH = btoa('admin123')

function hashPassword(password: string): string {
  return btoa(password)
}

function verifyPassword(password: string, hash: string): boolean {
  try {
    return btoa(password) === hash
  } catch {
    return false
  }
}

export function getUsers(): User[] {
  try {
    const raw = localStorage.getItem(USERS_KEY)
    return raw ? (JSON.parse(raw) as User[]) : []
  } catch {
    return []
  }
}

function setUsers(users: User[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users))
}

export function ensureAdminUser(): void {
  const users = getUsers()
  if (users.length > 0) return
  const admin: User = {
    id: crypto.randomUUID(),
    username: 'admin',
    password: DEFAULT_ADMIN_HASH,
    role: 'admin',
    displayName: 'Admin',
    percentage: 100,
    active: true,
    createdAt: new Date().toISOString(),
  }
  setUsers([admin])
}

export function authLogin(
  username: string,
  password: string,
): { success: true; session: Session } | { success: false; error: string } {
  const users = getUsers()
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase().trim())
  if (!user) return { success: false, error: 'Usuário não encontrado.' }
  if (!user.active) return { success: false, error: 'Usuário inativo. Fale com o administrador.' }
  if (!verifyPassword(password, user.password)) return { success: false, error: 'Senha incorreta.' }

  const session: Session = {
    userId: user.id,
    username: user.username,
    displayName: user.displayName,
    role: user.role,
  }
  localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  return { success: true, session }
}

export function authLogout(): void {
  localStorage.removeItem(SESSION_KEY)
}

export function getSession(): Session | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as Session) : null
  } catch {
    return null
  }
}

export function isDefaultAdminPassword(userId: string): boolean {
  const user = getUsers().find(u => u.id === userId)
  return user?.role === 'admin' && user?.password === DEFAULT_ADMIN_HASH
}

export function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): { success: true } | { success: false; error: string } {
  const users = getUsers()
  const idx = users.findIndex(u => u.id === userId)
  if (idx === -1) return { success: false, error: 'Usuário não encontrado.' }

  const user = users[idx]
  if (!verifyPassword(currentPassword, user.password)) {
    return { success: false, error: 'Senha atual incorreta.' }
  }
  if (newPassword.length < 4) {
    return { success: false, error: 'Nova senha deve ter pelo menos 4 caracteres.' }
  }

  users[idx] = { ...user, password: hashPassword(newPassword) }
  setUsers(users)
  return { success: true }
}
