export interface User {
  id: string
  username: string
  password: string       // btoa encoded
  role: 'admin' | 'user'
  displayName: string
  percentage: number     // 0–100 — percentual de sociedade
  active: boolean
  createdAt: string
}

export interface Session {
  userId: string
  username: string
  displayName: string
  role: 'admin' | 'user'
}
