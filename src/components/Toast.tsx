import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
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
            flex items-center gap-3 pl-3.5 pr-3 py-3 rounded-xl shadow-pop cursor-pointer
            text-sm font-medium text-white min-w-[240px] max-w-sm
            animate-slide-in transition-all
            ${t.tipo === 'sucesso' ? 'bg-emerald-600' : t.tipo === 'erro' ? 'bg-red-600' : 'bg-blue-600'}
          `}
        >
          <span className="flex-shrink-0">
            {t.tipo === 'sucesso' ? <CheckCircle2 className="w-[18px] h-[18px]" /> : t.tipo === 'erro' ? <XCircle className="w-[18px] h-[18px]" /> : <Info className="w-[18px] h-[18px]" />}
          </span>
          <span className="flex-1">{t.mensagem}</span>
          <X className="w-4 h-4 text-white/50 flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}
