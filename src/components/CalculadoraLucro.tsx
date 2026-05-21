import { useState, useEffect, useCallback } from 'react'
import { Config } from '../types'
import { calcularLiquido } from '../utils/calculos'
import { formatarEUR, formatarMoedaBR } from '../utils/formatacao'
import { usePartners } from '../hooks/usePartners'

interface Props {
  config: Config
  onToast: (msg: string, tipo?: 'sucesso' | 'erro' | 'info') => void
}

type Moeda = 'BRL' | 'USD' | 'EUR'
interface CustoExtra { id: string; descricao: string; valor: string; moeda: Moeda; cotacaoUsd: string }

const inputClass = `w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3.5 py-2.5 text-sm
  bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100
  focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all tabular-nums`

const selectClass = `border border-gray-200 dark:border-gray-600 rounded-xl px-2 py-2.5 text-sm
  bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100
  focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all`

const num = (s: string) => parseFloat(s.replace(',', '.')) || 0
const int = (s: string) => parseInt(s) || 0

function formatarPct(valor: number): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'
}

// Converte um valor de qualquer moeda para EUR.
// cot       = cotação EUR/BRL (quantos BRL valem 1 EUR — das configurações)
// cotacaoUsd = cotação USD→EUR informada manualmente (quantos EUR vale 1 USD)
function paraEur(valor: number, moeda: Moeda, cot: number, cotacaoUsd: number): number {
  if (moeda === 'EUR') return valor
  if (moeda === 'BRL') return cot > 0 ? valor / cot : 0
  return valor * cotacaoUsd // USD
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

function BlockCard({ titulo, icon, children }: { titulo: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
        <span className="text-base">{icon}</span>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100">{titulo}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function LinhaValor({ label, eur, brl, strong }: { label: string; eur: string; brl?: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1.5 gap-3">
      <span className={`text-sm ${strong ? 'font-semibold text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}>
        {label}
      </span>
      <div className="text-right tabular-nums whitespace-nowrap">
        <span className={strong ? 'text-sm font-bold text-gray-900 dark:text-white' : 'text-sm font-medium text-gray-700 dark:text-gray-300'}>
          {eur}
        </span>
        {brl && <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{brl}</span>}
      </div>
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
          destaque ? 'text-white' : negativo ? 'text-red-600 dark:text-red-400' : 'text-gray-900 dark:text-white'
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
  const [moedaAds, setMoedaAds] = useState<Moeda>('BRL')
  const [cotacaoUsdAds, setCotacaoUsdAds] = useState('')
  const [custos, setCustos] = useState<CustoExtra[]>([
    { id: crypto.randomUUID(), descricao: '', valor: '', moeda: 'BRL', cotacaoUsd: '' },
  ])
  const [cotacao, setCotacao] = useState(config.cotacao_manual != null ? String(config.cotacao_manual) : '')

  // Re-sincroniza os defaults quando as configurações do usuário mudam
  // (ex.: config carrega do Supabase após o primeiro render)
  useEffect(() => {
    setTaxaGateway(String(config.taxa_gateway))
    setTaxaFixa(String(config.taxa_fixa_eur))
    setCotacao(config.cotacao_manual != null ? String(config.cotacao_manual) : '')
  }, [config.taxa_gateway, config.taxa_fixa_eur, config.cotacao_manual])

  const addCusto = () =>
    setCustos(prev => [...prev, { id: crypto.randomUUID(), descricao: '', valor: '', moeda: 'BRL', cotacaoUsd: '' }])
  const removeCusto = (id: string) => setCustos(prev => prev.filter(c => c.id !== id))
  const updateCusto = (id: string, patch: Partial<CustoExtra>) =>
    setCustos(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)))

  // ── Cálculos em tempo real ──
  const bruto = num(faturamentoBruto)
  const pctGateway = num(taxaGateway)
  const fixaGateway = num(taxaFixa)
  const vendas = int(numVendas)
  const cot = num(cotacao)

  const temCotacao = cot > 0
  const brl = (v: number) => (temCotacao ? formatarMoedaBR(v) : '—')

  // Gasto em anúncios convertido para EUR
  const anunciosRaw = num(gastoAnuncios)
  const cotacaoUsdAdsNum = num(cotacaoUsdAds)
  const anunciosEur = paraEur(anunciosRaw, moedaAds, cot, cotacaoUsdAdsNum)

  // Custos extras: valor convertido para EUR por item
  const custosCalc = custos.map(c => ({
    ...c,
    eur: paraEur(num(c.valor), c.moeda, cot, num(c.cotacaoUsd)),
  }))
  const totalOutros = custosCalc.reduce((s, c) => s + c.eur, 0)
  const custosResultado = custosCalc.filter(c => num(c.valor) !== 0 || c.descricao.trim() !== '')

  // Gateway detalhado
  const custoGatewayPercent = bruto * (pctGateway / 100)
  const custoGatewayFixo = fixaGateway * vendas
  const totalGateway = custoGatewayPercent + custoGatewayFixo

  const liquido = calcularLiquido(bruto, pctGateway, fixaGateway, vendas)
  const totalCustos = totalGateway + anunciosEur + totalOutros
  const lucroEur = liquido - anunciosEur - totalOutros
  const lucroBrl = lucroEur * cot
  const margem = bruto > 0 ? (lucroEur / bruto) * 100 : 0

  return (
    <div className="space-y-5">
      {/* ── Entradas ── */}
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

          {/* Gasto em Anúncios com seletor de moeda */}
          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Gasto em Anúncios</label>
            <div className="flex gap-2">
              <input
                type="text" inputMode="decimal"
                value={gastoAnuncios}
                onChange={e => setGastoAnuncios(e.target.value)}
                placeholder="Ex: 1500.00"
                className={inputClass}
              />
              <select value={moedaAds} onChange={e => setMoedaAds(e.target.value as Moeda)} className={selectClass}>
                <option value="BRL">BRL</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
            {moedaAds === 'USD' && (
              <input
                type="text" inputMode="decimal"
                value={cotacaoUsdAds}
                onChange={e => setCotacaoUsdAds(e.target.value)}
                placeholder="Cotação USD→EUR (ex: 0.92)"
                className={`${inputClass} mt-2`}
              />
            )}
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 tabular-nums">
              ≈ {formatarEUR(anunciosEur)} em euros
              {moedaAds === 'BRL' && !temCotacao && anunciosRaw > 0 ? ' — defina a cotação EUR/BRL' : ''}
              {moedaAds === 'USD' && cotacaoUsdAdsNum <= 0 && anunciosRaw > 0 ? ' — informe a cotação USD→EUR' : ''}
            </p>
          </div>
        </div>

        {/* Outros custos — lista dinâmica com moeda por item */}
        <div className="mt-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400">Outros custos</label>
            <button
              type="button"
              onClick={addCusto}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
            >
              + Adicionar Custo
            </button>
          </div>
          <div className="space-y-2">
            {custosCalc.map(c => (
              <div key={c.id} className="rounded-xl border border-gray-100 dark:border-gray-700 p-3 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={c.descricao}
                    onChange={e => updateCusto(c.id, { descricao: e.target.value })}
                    placeholder="Descrição (ex: Ferramentas)"
                    className={`${inputClass} flex-1`}
                  />
                  <input
                    type="text" inputMode="decimal"
                    value={c.valor}
                    onChange={e => updateCusto(c.id, { valor: e.target.value })}
                    placeholder="0,00"
                    className={`${inputClass} w-24 sm:w-28`}
                  />
                  <select
                    value={c.moeda}
                    onChange={e => updateCusto(c.id, { moeda: e.target.value as Moeda })}
                    className={selectClass}
                  >
                    <option value="BRL">BRL</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeCusto(c.id)}
                    title="Remover custo"
                    className="w-10 flex-shrink-0 flex items-center justify-center rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-500 dark:text-red-400 transition-colors"
                  >
                    ✕
                  </button>
                </div>
                {c.moeda === 'USD' && (
                  <input
                    type="text" inputMode="decimal"
                    value={c.cotacaoUsd}
                    onChange={e => updateCusto(c.id, { cotacaoUsd: e.target.value })}
                    placeholder="Cotação USD→EUR (ex: 0.92)"
                    className={inputClass}
                  />
                )}
                <p className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">≈ {formatarEUR(c.eur)} em euros</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 rounded-xl p-3 text-xs text-blue-700 dark:text-blue-300 mt-5 font-mono">
          Lucro = Faturamento − Gateway − Anúncios − Outros custos
        </div>
      </div>

      {/* ── Bloco 1: Faturamento ── */}
      <BlockCard titulo="Faturamento" icon="🪙">
        <LinhaValor label="Faturamento Bruto" eur={formatarEUR(bruto)} brl={brl(bruto * cot)} strong />
      </BlockCard>

      {/* ── Bloco 2: Custo Gateway ── */}
      <BlockCard titulo="Custo Gateway" icon="🏦">
        <LinhaValor label={`Taxa percentual (${pctGateway}%)`} eur={formatarEUR(custoGatewayPercent)} />
        <LinhaValor label={`Taxa fixa (${vendas} × €${fixaGateway})`} eur={formatarEUR(custoGatewayFixo)} />
        <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
          <LinhaValor label="Total Gateway" eur={formatarEUR(totalGateway)} brl={brl(totalGateway * cot)} strong />
        </div>
      </BlockCard>

      {/* ── Bloco 3: Outros Custos ── */}
      <BlockCard titulo="Outros Custos" icon="🧾">
        {custosResultado.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">Nenhum custo extra adicionado.</p>
        ) : (
          <div className="space-y-1">
            {custosResultado.map(c => (
              <LinhaValor
                key={c.id}
                label={c.descricao.trim() || 'Custo sem descrição'}
                eur={formatarEUR(c.eur)}
                brl={brl(c.eur * cot)}
              />
            ))}
          </div>
        )}
        <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2">
          <LinhaValor label="Total Outros Custos" eur={formatarEUR(totalOutros)} brl={brl(totalOutros * cot)} strong />
        </div>
      </BlockCard>

      {/* ── Bloco 4: Resultados Finais (destaque em BRL) ── */}
      <div>
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3 flex items-center gap-2">
          <span>🎯</span> Resultados Finais
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <ResultCard
            titulo="Líquido após gateway"
            valorPrincipal={brl(liquido * cot)}
            valorSecundario={formatarEUR(liquido)}
            icon="💶"
            cor="bg-indigo-500"
          />
          <ResultCard
            titulo="Total de custos"
            valorPrincipal={brl(totalCustos * cot)}
            valorSecundario={formatarEUR(totalCustos)}
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
      </div>

      {/* ── Bloco 5: Distribuição por Sócio ── */}
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
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Lucro (R$)</th>
                  <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Lucro (€)</th>
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
                      <td className={`px-4 py-3.5 text-right font-semibold tabular-nums ${parteBrl < 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        {brl(parteBrl)}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-semibold tabular-nums ${parteEur < 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-800 dark:text-gray-200'}`}>
                        {formatarEUR(parteEur)}
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
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">
                    {brl(lucroBrl * partners.reduce((s, p) => s + p.percentage, 0) / 100)}
                  </td>
                  <td className="px-5 py-3 text-right font-semibold text-gray-800 dark:text-gray-200 tabular-nums">
                    {formatarEUR(lucroEur * partners.reduce((s, p) => s + p.percentage, 0) / 100)}
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
