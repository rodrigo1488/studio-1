import { supabaseServer } from './server';
import bcrypt from 'bcryptjs';
import type { User } from '@/lib/data';

// Re-export for backward compatibility
export type { User };

/**
 * Register a new user
 */
export async function registerUser(
  email: string,
  password: string,
  name: string
): Promise<{ user: User; error: null } | { user: null; error: string }> {
  try {
    if (!supabaseServer) {
      return { user: null, error: 'Configuração do Supabase não encontrada' };
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseServer
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return { user: null, error: 'Email já está em uso' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const { data: user, error } = await supabaseServer
      .from('users')
      .insert({
        email,
        password_hash: passwordHash,
        name,
      })
      .select('id, email, name, avatar_url')
      .single();

    if (error) {
      return { user: null, error: error.message };
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url || undefined,
      },
      error: null,
    };
  } catch (error) {
    return { user: null, error: 'Erro ao criar conta' };
  }
}

/**
 * Login user
 */
export async function loginUser(
  email: string,
  password: string
): Promise<{ user: User; error: null } | { user: null; error: string }> {
  try {
    if (!supabaseServer) {
      return { user: null, error: 'Configuração do Supabase não encontrada' };
    }

    // Get user by email
    const { data: user, error: fetchError } = await supabaseServer
      .from('users')
      .select('id, email, name, avatar_url, password_hash')
      .eq('email', email)
      .single();

    if (fetchError || !user) {
      return { user: null, error: 'Email ou senha incorretos' };
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return { user: null, error: 'Email ou senha incorretos' };
    }

    // Return user without password hash
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatarUrl: user.avatar_url || undefined,
      },
      error: null,
    };
  } catch (error) {
    return { user: null, error: 'Erro ao fazer login' };
  }
}

/**
 * Logout user (clear session)
 */
export async function logoutUser(): Promise<void> {
  // Clear any stored session data
  // In a real implementation, you'd clear cookies or tokens
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  try {
    if (!supabaseServer) {
      return null;
    }

    const { data, error } = await supabaseServer
      .from('users')
      .select('id, email, name, avatar_url, nickname, bio')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      avatarUrl: data.avatar_url || undefined,
      nickname: data.nickname || undefined,
      bio: data.bio || undefined,
    };
  } catch (error) {
    return null;
  }
}

