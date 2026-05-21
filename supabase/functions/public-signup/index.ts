import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Cadastro PÚBLICO (sem autenticação). Deve ser deployada com --no-verify-jwt.
// Usa SERVICE_ROLE_KEY para criar o usuário no Auth e gravar perfil/configurações,
// contornando a RLS sem precisar de policy de auto-insert. A role é SEMPRE 'user':
// cadastro público nunca cria admin (apenas o admin promove via tela de Usuários).

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const USERNAME_RE = /^[a-zA-Z0-9_]+$/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const body = await req.json().catch(() => null)
    if (!body) return json({ success: false, error: 'Requisição inválida.' })

    const display_name = String(body.display_name ?? '').trim()
    const username = String(body.username ?? '').trim().toLowerCase()
    const email = String(body.email ?? '').trim().toLowerCase()
    const password = String(body.password ?? '')

    // Validações — autoridade no servidor (o cliente também valida, mas isto é a fonte de verdade)
    if (!display_name) return json({ success: false, error: 'Informe o nome completo.' })
    if (!username) return json({ success: false, error: 'Informe o nome de usuário.' })
    if (!USERNAME_RE.test(username)) {
      return json({ success: false, error: 'Usuário deve conter apenas letras, números e underscore, sem espaços.' })
    }
    if (!EMAIL_RE.test(email)) return json({ success: false, error: 'Email inválido.' })
    if (password.length < 6) return json({ success: false, error: 'A senha deve ter no mínimo 6 caracteres.' })

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Verifica se o username já existe
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('username', username)
      .maybeSingle()
    if (checkError) return json({ success: false, error: 'Erro ao verificar disponibilidade do usuário.' })
    if (existing) return json({ success: false, error: 'Este nome de usuário já está em uso.' })

    // Cria no Auth com email já confirmado → usuário entra direto, sem confirmação por email
    const { data: newAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (createError || !newAuth.user) {
      const m = (createError?.message ?? '').toLowerCase()
      if (m.includes('already') || m.includes('registered') || m.includes('exists')) {
        return json({ success: false, error: 'Este email já está cadastrado.' })
      }
      return json({ success: false, error: createError?.message ?? 'Erro ao criar conta.' })
    }

    const userId = newAuth.user.id

    // Perfil (role SEMPRE 'user')
    const { error: profileError } = await supabaseAdmin.from('users').insert({
      id: userId,
      username,
      email,
      display_name,
      role: 'user',
      percentage: 0,
      active: true,
      password_changed: true,
    })
    if (profileError) {
      await supabaseAdmin.auth.admin.deleteUser(userId) // rollback do Auth
      const m = profileError.message.toLowerCase()
      if (m.includes('duplicate') || m.includes('unique')) {
        return json({ success: false, error: 'Usuário ou email já cadastrado.' })
      }
      return json({ success: false, error: 'Erro ao criar perfil.' })
    }

    // Configurações padrão
    const { error: settingsError } = await supabaseAdmin.from('settings').insert({
      user_id: userId,
      gateway_percentage: 28,
      gateway_fixed_fee: 2,
      report_name: 'OP | PORTUGAL',
      exchange_rate: 5.83,
    })
    if (settingsError) {
      // rollback completo: remove perfil + Auth
      await supabaseAdmin.from('users').delete().eq('id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return json({ success: false, error: 'Erro ao criar configurações.' })
    }

    // Sócio padrão: o dono da conta entra como sócio de 100% (gerenciável depois,
    // ao adicionar outros sócios). Garante que toda conta já nasce com uma divisão.
    const { error: partnerError } = await supabaseAdmin.from('partners').insert({
      user_id: userId,
      name: display_name,
      percentage: 100,
      active: true,
    })
    if (partnerError) {
      // rollback completo: remove configurações + perfil + Auth
      await supabaseAdmin.from('settings').delete().eq('user_id', userId)
      await supabaseAdmin.from('users').delete().eq('id', userId)
      await supabaseAdmin.auth.admin.deleteUser(userId)
      return json({ success: false, error: 'Erro ao criar sócio padrão.' })
    }

    return json({ success: true, userId })
  } catch (e) {
    return json({ success: false, error: String(e) }, 500)
  }
})
