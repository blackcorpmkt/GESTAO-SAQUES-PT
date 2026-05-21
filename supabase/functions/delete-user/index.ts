import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Exclusão de usuário (admin only). Deleta o usuário do Auth via service role —
// o ON DELETE CASCADE em users/launches/partners/settings/launch_costs
// (todas referenciam auth.users(id)) apaga automaticamente os dados do usuário.

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Unauthorized' }, 401)

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SERVICE_ROLE_KEY')!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    )

    // Identifica o chamador pelo JWT
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(
      authHeader.replace('Bearer ', ''),
    )
    if (userError || !user) return json({ error: 'Unauthorized' }, 401)

    // Confirma que o chamador é admin
    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single()
    if (callerProfile?.role !== 'admin') {
      return json({ error: 'Apenas administradores podem excluir usuários' }, 403)
    }

    const { user_id } = await req.json().catch(() => ({}))
    if (!user_id || typeof user_id !== 'string') {
      return json({ error: 'user_id é obrigatório.' }, 400)
    }

    // Guardas server-side (a UI também impede, mas isto é a fonte de verdade)
    if (user_id === user.id) {
      return json({ error: 'Você não pode excluir a própria conta.' }, 400)
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', user_id)
      .maybeSingle()
    if (targetError) return json({ error: 'Erro ao verificar o usuário.' }, 400)
    if (!target) return json({ error: 'Usuário não encontrado.' }, 404)
    if (target.role === 'admin') {
      return json({ error: 'Não é possível excluir um administrador.' }, 400)
    }

    // Exclui do Auth → CASCADE apaga perfil, lançamentos, sócios e configurações
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id)
    if (deleteError) return json({ error: deleteError.message }, 400)

    return json({ success: true })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})
