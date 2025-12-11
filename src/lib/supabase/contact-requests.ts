import { supabaseServer } from './server';
import { supabase } from './client';
import type { ContactRequest, User } from '@/lib/data';

/**
 * Send a contact request
 */
export async function sendContactRequest(
  requesterId: string,
  requestedId: string
): Promise<{ request: ContactRequest | null; error: string | null }> {
  if (!supabaseServer) {
    return { request: null, error: 'Supabase server not initialized' };
  }

  try {
    // Check if users are already contacts
    const { data: existingContact1 } = await supabaseServer
      .from('contacts')
      .select('id')
      .eq('user_id', requesterId)
      .eq('contact_id', requestedId)
      .maybeSingle();

    const { data: existingContact2 } = await supabaseServer
      .from('contacts')
      .select('id')
      .eq('user_id', requestedId)
      .eq('contact_id', requesterId)
      .maybeSingle();

    const existingContact = existingContact1 || existingContact2;

    if (existingContact) {
      return { request: null, error: 'Usuários já são contatos' };
    }

    // Check if there's already a pending request
    const { data: existingRequest1 } = await supabaseServer
      .from('contact_requests')
      .select('id, status')
      .eq('requester_id', requesterId)
      .eq('requested_id', requestedId)
      .maybeSingle();

    const { data: existingRequest2 } = await supabaseServer
      .from('contact_requests')
      .select('id, status')
      .eq('requester_id', requestedId)
      .eq('requested_id', requesterId)
      .maybeSingle();

    const existingRequest = existingRequest1 || existingRequest2;

    if (existingRequest) {
      if (existingRequest.status === 'pending') {
        return { request: null, error: 'Já existe uma solicitação pendente' };
      }
      // If rejected, update to pending
      if (existingRequest.status === 'rejected') {
        const { data: updated, error: updateError } = await supabaseServer
          .from('contact_requests')
          .update({ status: 'pending', updated_at: new Date().toISOString() })
          .eq('id', existingRequest.id)
          .select()
          .single();

        if (updateError || !updated) {
          return { request: null, error: updateError?.message || 'Erro ao atualizar solicitação' };
        }

        return { request: convertToContactRequest(updated), error: null };
      }
    }

    // Create new request
    const { data, error } = await supabaseServer
      .from('contact_requests')
      .insert({
        requester_id: requesterId,
        requested_id: requestedId,
        status: 'pending',
      })
      .select()
      .single();

    if (error || !data) {
      return { request: null, error: error?.message || 'Erro ao criar solicitação' };
    }

    return { request: convertToContactRequest(data), error: null };
  } catch (error: any) {
    return { request: null, error: error.message || 'Erro ao enviar solicitação' };
  }
}

/**
 * Get pending contact requests for a user (requests they received)
 */
export async function getPendingRequests(
  userId: string
): Promise<{ requests: ContactRequest[]; error: string | null }> {
  if (!supabaseServer) {
    return { requests: [], error: 'Supabase server not initialized' };
  }

  try {
    const { data, error } = await supabaseServer
      .from('contact_requests')
      .select(`
        *,
        requester:users!contact_requests_requester_id_fkey(id, name, email, avatar_url, nickname),
        requested:users!contact_requests_requested_id_fkey(id, name, email, avatar_url, nickname)
      `)
      .eq('requested_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return { requests: [], error: error.message };
    }

    const requests = (data || []).map(convertToContactRequest);
    return { requests, error: null };
  } catch (error: any) {
    return { requests: [], error: error.message || 'Erro ao buscar solicitações' };
  }
}

/**
 * Get sent contact requests for a user
 */
export async function getSentRequests(
  requesterId: string
): Promise<{ requests: ContactRequest[]; error: string | null }> {
  if (!supabaseServer) {
    return { requests: [], error: 'Supabase server not initialized' };
  }

  try {
    const { data, error } = await supabaseServer
      .from('contact_requests')
      .select(`
        *,
        requested:users!contact_requests_requested_id_fkey(id, name, email, avatar_url, nickname)
      `)
      .eq('requester_id', requesterId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      return { requests: [], error: error.message };
    }

    const requests = (data || []).map(convertToContactRequest);
    return { requests, error: null };
  } catch (error: any) {
    return { requests: [], error: error.message || 'Erro ao buscar solicitações enviadas' };
  }
}

/**
 * Accept a contact request and create bidirectional contacts
 */
export async function acceptContactRequest(
  requestId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server not initialized' };
  }

  try {
    // Get the request
    const { data: request, error: fetchError } = await supabaseServer
      .from('contact_requests')
      .select('requester_id, requested_id, status')
      .eq('id', requestId)
      .eq('requested_id', userId)
      .eq('status', 'pending')
      .single();

    if (fetchError || !request) {
      return { success: false, error: 'Solicitação não encontrada ou já processada' };
    }

    // Update request status
    const { error: updateError } = await supabaseServer
      .from('contact_requests')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    // Create bidirectional contacts
    const { error: contact1Error } = await supabaseServer
      .from('contacts')
      .insert({
        user_id: request.requester_id,
        contact_id: request.requested_id,
      });

    if (contact1Error) {
      console.error('Error creating contact 1:', contact1Error);
    }

    const { error: contact2Error } = await supabaseServer
      .from('contacts')
      .insert({
        user_id: request.requested_id,
        contact_id: request.requester_id,
      });

    if (contact2Error) {
      console.error('Error creating contact 2:', contact2Error);
    }

    if (contact1Error || contact2Error) {
      return { success: false, error: 'Erro ao criar contatos' };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao aceitar solicitação' };
  }
}

/**
 * Reject a contact request
 */
export async function rejectContactRequest(
  requestId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server not initialized' };
  }

  try {
    const { error } = await supabaseServer
      .from('contact_requests')
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('id', requestId)
      .eq('requested_id', userId)
      .eq('status', 'pending');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao recusar solicitação' };
  }
}

/**
 * Cancel a contact request (by requester)
 */
export async function cancelContactRequest(
  requestId: string,
  requesterId: string
): Promise<{ success: boolean; error: string | null }> {
  if (!supabaseServer) {
    return { success: false, error: 'Supabase server not initialized' };
  }

  try {
    const { error } = await supabaseServer
      .from('contact_requests')
      .delete()
      .eq('id', requestId)
      .eq('requester_id', requesterId)
      .eq('status', 'pending');

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error: any) {
    return { success: false, error: error.message || 'Erro ao cancelar solicitação' };
  }
}

/**
 * Convert database contact request to app format
 */
function convertToContactRequest(dbRequest: any): ContactRequest {
  const requester = dbRequest.requester
    ? {
        id: dbRequest.requester.id,
        name: dbRequest.requester.name,
        email: dbRequest.requester.email,
        avatarUrl: dbRequest.requester.avatar_url || undefined,
        nickname: dbRequest.requester.nickname || undefined,
      }
    : undefined;

  const requested = dbRequest.requested
    ? {
        id: dbRequest.requested.id,
        name: dbRequest.requested.name,
        email: dbRequest.requested.email,
        avatarUrl: dbRequest.requested.avatar_url || undefined,
        nickname: dbRequest.requested.nickname || undefined,
      }
    : undefined;

  return {
    id: dbRequest.id,
    requesterId: dbRequest.requester_id,
    requestedId: dbRequest.requested_id,
    status: dbRequest.status,
    createdAt: dbRequest.created_at instanceof Date ? dbRequest.created_at : new Date(dbRequest.created_at),
    updatedAt: dbRequest.updated_at instanceof Date ? dbRequest.updated_at : new Date(dbRequest.updated_at),
    requester,
    requested,
  };
}

