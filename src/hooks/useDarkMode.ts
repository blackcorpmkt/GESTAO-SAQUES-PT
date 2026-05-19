import { useState, useEffect } from 'react'

const KEY = 'gestao_saques:dark_mode'

export function useDarkMode() {
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem(KEY) === 'true')

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
    localStorage.setItem(KEY, String(darkMode))
  }, [darkMode])

  return { darkMode, toggleDarkMode: () => setDarkMode(p => !p) }
}
