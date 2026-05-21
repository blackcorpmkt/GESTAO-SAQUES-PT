export interface UserProfile {
  userId: string          // auth.users.id (uuid)
  username: string
  email: string
  displayName: string
  role: 'admin' | 'user'
  percentage: number
  passwordChanged: boolean
}

// Alias mantido para compatibilidade com referências existentes
export type Session = UserProfile
