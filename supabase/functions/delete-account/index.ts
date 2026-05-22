/// <reference path="../_shared/edge-runtime-shims.d.ts" />

import { createClient } from 'npm:@supabase/supabase-js@2'

import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (request: Request) => {
  try {
    if (request.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (request.method !== 'POST') {
      return Response.json(
        { error: 'Method not allowed' },
        {
          status: 405,
          headers: corsHeaders,
        }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !serviceRoleKey) {
      return Response.json(
        { error: 'Missing function configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.' },
        {
          status: 500,
          headers: corsHeaders,
        }
      )
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const authHeader = request.headers.get('Authorization')

    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json(
        { error: 'Missing authorization header' },
        {
          status: 401,
          headers: corsHeaders,
        }
      )
    }

    const accessToken = authHeader.replace('Bearer ', '').trim()

    const {
      data: { user },
      error: userError,
    } = await adminClient.auth.getUser(accessToken)

    if (userError || !user) {
      return Response.json(
        { error: 'Unauthorized' },
        {
          status: 401,
          headers: corsHeaders,
        }
      )
    }

    const userScopedClient = createClient(supabaseUrl, serviceRoleKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    })

    const { error: cleanupError } = await userScopedClient.rpc('delete_my_account_data')

    if (cleanupError) {
      return Response.json(
        { error: cleanupError.message || 'Failed to delete application data' },
        {
          status: 500,
          headers: corsHeaders,
        }
      )
    }

    const { error: deleteUserError } = await adminClient.auth.admin.deleteUser(user.id)

    if (deleteUserError) {
      return Response.json(
        { error: deleteUserError.message || 'Failed to delete authentication account' },
        {
          status: 500,
          headers: corsHeaders,
        }
      )
    }

    return Response.json(
      {
        deleted: true,
        user_id: user.id,
      },
      {
        headers: corsHeaders,
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected delete-account failure'

    return Response.json(
      { error: message },
      {
        status: 500,
        headers: corsHeaders,
      }
    )
  }
})