import { useState, useEffect, useCallback } from 'react'
import { Config } from '../types'
import { calcularLiquido } from '../utils/calculos'
import { formatarEUR, formatarMoedaBR } from '../utils/formatacao'
import { usePartners } from '../hooks/usePartners'

interface Props {
  config: Config
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

const inputClass = `w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3.5 py-2.5 text-sm
  bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all tabular-nums`

const num = (s: string) => parseFloat(s.replace(',', '.')) || 0
const int = (s: string) => parseInt(s) || 0

function formatarPct(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">{label}</label>
      {children}
      {hint && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{hint}</p>}
    </div>
  )
}

function ResultCard({
  titulo,
  valorPrincipal,
  valorSecundario,
  icon,
  cor,
  destaque,
  negativo,
}: {
  titulo: string
  valorPrincipal: string
  valorSecundario?: string
  icon: string
  cor: string
  destaque?: boolean
  negativo?: boolean
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl p-5 shadow-sm border transition-all duration-200 hover:shadow-md ${
        destaque
          ? 'bg-gradient-to-br from-blue-600 to-blue-700 border-blue-700 text-white'
          : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'
      }`}
    >
      {!destaque && (
        <div className={`absolute top-0 right-0 w-24 h-24 rounded-full opacity-10 -translate-y-6 translate-x-6 ${cor}`} />
      )}
      <div className="flex items-start justify-between mb-3">
        <p className={`text-xs font-semibold uppercase tracking-wider ${destaque ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
          {titulo}
        </p>
        <span className={`text-xl ${destaque ? 'text-blue-100' : cor.replace('bg-', 'text-')}`}>{icon}</span>
      </div>
      <p
        className={`text-2xl font-bold mb-1 tabular-nums ${
          destaque
            ? 'text-white'
            : negativo
            ? 'text-red-600 dark:text-red-400'
            : 'text-gray-900 dark:text-white'
        }`}
      >
        {valorPrincipal}
      </p>
      {valorSecundario && (
        <p className={`text-sm font-medium tabular-nums ${destaque ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'}`}>
          {valorSecundario}
        </p>
      )}
    </div>
  )
}

export function CalculadoraLucro({ config, onToast }: Props) {
  const handleError = useCallback((msg: string) => onToast(msg, 'erro'), [onToast])
  const { partners, loading: loadingPartners } = usePartners(handleError)

  // Inputs — campos que puxam das configurações são pré-preenchidos
  const [faturamentoBruto, setFaturamentoBruto] = useState('')
  const [taxaGateway, setTaxaGateway] = useState(String(config.taxa_gateway))
  const [taxaFixa, setTaxaFixa] = useState(String(config.taxa_fixa_eur))
  const [numVendas, setNumVendas] = useState('')
  const [gastoAnuncios, setGastoAnuncios] = useState('')
  const [outrosLabel, setOutrosLabel] = useState('Outros custos')
  const [outrosValor, setOutrosValor] = useState('')
  const [cotacao, setCotacao] = useState(config.cotacao_manual != null ? String(config.cotacao_manual) : '')

  // Re-sincroniza os defaults quando as configurações do usuário mudam
  // (ex.: config carrega do Supabase após o primeiro render)
  useEffect(() => {
    setTaxaGateway(String(config.taxa_gateway))
    setTaxaFixa(String(config.taxa_fixa_eur))
    setCotacao(config.cotacao_manual != null ? String(config.cotacao_manual) : '')
  }, [config.taxa_gateway, config.taxa_fixa_eur, config.cotacao_manual])

  // ── Cálculos em tempo real ──
  const bruto = num(faturamentoBruto)
  const pctGateway = num(taxaGateway)
  const fixaGateway = num(taxaFixa)
  const vendas = int(numVendas)
  const anuncios = num(gastoAnuncios)
  const outros = num(outrosValor)
  const cot = num(cotacao)

  const liquido = calcularLiquido(bruto, pctGateway, fixaGateway, vendas)
  const custoGateway = bruto - liquido
  const totalCustos = custoGateway + anuncios + outros
  const lucroEur = liquido - anuncios - outros
  const lucroBrl = lucroEur * cot
  const margem = bruto > 0 ? (lucroEur / bruto) * 100 : 0

  const temCotacao = cot > 0
  const brl = (v: number) => (temCotacao ? formatarMoedaBR(v) : '—')

  return (
    <div className="space-y-5">
      {/* Entradas */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-5">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center text-blue-600 dark:text-blue-400 text-base">
            🧮
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Calculadora de Lucro</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Simulação independente — nada é salvo no banco
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Faturamento Bruto (€)">
            <input
              type="text" inputMode="decimal"
              value={faturamentoBruto}
              onChange={e => setFaturamentoBruto(e.target.value)}
              placeholder="Ex: 10000.00"
              className={inputClass}
              autoFocus
            />
          </Field>

          <Field label="Nº de vendas aprovadas">
            <input
              type="number" min="0"
              value={numVendas}
              onChange={e => setNumVendas(e.target.value)}
              placeholder="Ex: 50"
              className={inputClass}
            />
          </Field>

          <Field label="Cotação EUR/BRL" hint="Padrão: configurações">
            <input
              type="text" inputMode="decimal"
              value={cotacao}
              onChange={e => setCotacao(e.target.value)}
              placeholder="Ex: 5.83"
              className={inputClass}
            />
          </Field>

          <Field label="Taxa do Gateway (%)" hint="Padrão: configurações">
            <input
              type="number" step="0.01" min="0" max="99"
              value={taxaGateway}
              onChange={e => setTaxaGateway(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Taxa fixa do Gateway por venda (€)" hint="Padrão: configurações">
            <input
              type="number" step="0.01" min="0"
              value={taxaFixa}
              onChange={e => setTaxaFixa(e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Gasto em Anúncios (€)">
            <input
              type="text" inputMode="decimal"
              value={gastoAnuncios}
              onChange={e => setGastoAnuncios(e.target.value)}
              placeholder="Ex: 1500.00"
              className={inputClass}
            />
          </Field>

          {/* Outros custos — label editável */}
          <div className="sm:col-span-2 lg:col-span-1">
            <input
              type="text"
              value={outrosLabel}
              onChange={e => setOutrosLabel(e.target.value)}
              placeholder="Outros custos"
              title="Clique para editar o nome deste custo"
              className="block w-full text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 bg-transparent border-b border-dashed border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500 pb-0.5"
            />
            <input
              type="text" inputMode="decimal"
              value={outrosValor}
              onChange={e => setOutrosValor(e.target.value)}
              placeholder="Ex: 300.00"
              className={inputClass}
            />
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 mt-5 font-mono">
          Lucro = Bruto − (Bruto × {pctGateway}%) − (€{fixaGateway} × vendas) − anúncios − {outrosLabel.toLowerCase() || 'outros'}
        </div>
      </div>

      {/* Resultados */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <ResultCard
          titulo="Líquido após gateway"
          valorPrincipal={formatarEUR(liquido)}
          valorSecundario={brl(liquido * cot)}
          icon="💶"
          cor="bg-indigo-500"
        />
        <ResultCard
          titulo="Total de custos"
          valorPrincipal={formatarEUR(totalCustos)}
          valorSecundario={`Gateway ${formatarEUR(custoGateway)}`}
          icon="📉"
          cor="bg-amber-500"
        />
        <ResultCard
          titulo="Lucro"
          valorPrincipal={brl(lucroBrl)}
          valorSecundario={formatarEUR(lucroEur)}
          icon="💰"
          cor="bg-emerald-500"
          destaque
        />
        <ResultCard
          titulo="Margem de lucro"
          valorPrincipal={formatarPct(margem)}
          valorSecundario={lucroEur >= 0 ? 'Operação lucrativa' : 'Operação no prejuízo'}
          icon="📊"
          cor="bg-violet-500"
          negativo={margem < 0}
        />
      </div>

      {/* Distribuição por sócio */}
      <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <span className="text-lg">👥</span>
          <div>
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-100">Distribuição por Sócio</h2>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              Parte de cada sócio ativo sobre o lucro calculado
            </p>
          </div>
        </div>

        {loadingPartners ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500 text-sm animate-pulse">
            Carregando sócios...
          </div>
        ) : partners.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">👤</p>
            <p className="text-gray-400 dark:text-gray-500 text-sm">Nenhum sócio ativo encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Sócio</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">%</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Lucro (€)</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Lucro (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
                {partners.map(p => {
                  const parteEur = lucroEur * p.percentage / 100
                  const parteBrl = lucroBrl * p.percentage / 100
                  return (
                    <tr key={p.username} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-gray-800 dark:text-gray-200">{p.displayName}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">
                          @{p.username}{p.role === 'admin' ? ' · admin' : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-center font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                        {p.percentage}%
                      </td>
                      <td className={`px-4 py-3.5 text-right font-semibold tabular-nums ${parteEur < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                        {formatarEUR(parteEur)}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-semibold tabular-nums ${parteBrl < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        {brl(parteBrl)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/80">
                  <td className="px-5 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Soma
                  </td>
                  <td className="px-4 py-3 text-center font-semibold text-gray-700 dark:text-gray-300 tabular-nums">
                    {partners.reduce((s, p) => s + p.percentage, 0)}%
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
                    {formatarEUR(lucroEur * partners.reduce((s, p) => s + p.percentage, 0) / 100)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {brl(lucroBrl * partners.reduce((s, p) => s + p.percentage, 0) / 100)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
