import { Toast as ToastType } from '../types'

interface Props {
  toasts: ToastType[]
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: Props) {
  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5">
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => onRemove(t.id)}
          className={`
            flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg cursor-pointer
            text-sm font-medium text-white min-w-[240px] max-w-sm
            animate-slide-in transition-all
            ${t.tipo === 'sucesso' ? 'bg-emerald-600' : t.tipo === 'erro' ? 'bg-red-600' : 'bg-blue-600'}
          `}
        >
          <span className="text-base flex-shrink-0">
            {t.tipo === 'sucesso' ? '✓' : t.tipo === 'erro' ? '✕' : 'ℹ'}
          </span>
          <span className="flex-1">{t.mensagem}</span>
          <span className="text-white/50 text-xs flex-shrink-0">✕</span>
        </div>
      ))}
    </div>
  )
}
