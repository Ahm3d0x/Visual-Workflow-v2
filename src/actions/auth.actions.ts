'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function signUp(email: string, password: string, fullName: string, locale: string = 'en') {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/${locale}/dashboard`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function signIn(email: string, password: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true, data };
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function signInWithGoogle(locale: string = 'en') {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/${locale}/dashboard`,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true, url: data.url };
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function signOut() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      return { error: error.message };
    }

    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function resetPassword(email: string, locale: string = 'en') {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/${locale}/settings/profile`,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' };
  }
}

export async function updatePassword(password: string) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true, data };
  } catch (err: any) {
    return { error: err.message || 'An unexpected error occurred' };
  }
}
