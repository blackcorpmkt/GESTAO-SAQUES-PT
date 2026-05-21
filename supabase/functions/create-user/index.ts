import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Verifica se o chamador é admin
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()

    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem criar usuários' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { email, password, username, display_name, role, percentage } = await req.json()

    // Cria o usuário no Supabase Auth
    const { data: newAuth, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      password,
      email_confirm: true,
    })

    if (createError || !newAuth.user) {
      return new Response(JSON.stringify({ error: createError?.message ?? 'Erro ao criar usuário' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Insere o perfil na tabela public.users
    const { error: insertError } = await supabaseAdmin.from('users').insert({
      id: newAuth.user.id,
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
      display_name: display_name.trim(),
      role: role ?? 'user',
      percentage: percentage ?? 0,
      active: true,
      password_changed: false,
    })

    if (insertError) {
      // Rollback: remove o auth user criado
      await supabaseAdmin.auth.admin.deleteUser(newAuth.user.id)
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Sócio padrão: contas de usuário comum nascem com o dono como sócio de 100%
    // (admins não operam lançamentos/divisão, então não recebem sócio padrão —
    // mesmo critério do backfill, que cobre apenas role = 'user').
    if ((role ?? 'user') === 'user') {
      const { error: partnerError } = await supabaseAdmin.from('partners').insert({
        user_id: newAuth.user.id,
        name: display_name.trim(),
        percentage: 100,
        active: true,
      })
      if (partnerError) {
        // Rollback completo: remove perfil + auth user
        await supabaseAdmin.from('users').delete().eq('id', newAuth.user.id)
        await supabaseAdmin.auth.admin.deleteUser(newAuth.user.id)
        return new Response(JSON.stringify({ error: 'Erro ao criar sócio padrão.' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    return new Response(JSON.stringify({ success: true, userId: newAuth.user.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
