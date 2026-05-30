'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function signUp(email: string, password: string, fullName: string, locale: string = 'en', redirectTo?: string) {
  try {
    const supabase = await createClient();
    const nextUrl = redirectTo || `/${locale}/dashboard`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true, data };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
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
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

export async function signInWithGoogle(locale: string = 'en', redirectTo?: string) {
  try {
    const supabase = await createClient();
    const nextUrl = redirectTo || `/${locale}/dashboard`;
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(nextUrl)}`,
      },
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true, url: data.url };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
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
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
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
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
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
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

export async function updateProfile(fullName: string, avatarUrl: string | null) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { error: 'Not authenticated' };
    }

    interface ProfilesUpdateResult {
      data: {
        id: string;
        email: string;
        full_name: string | null;
        avatar_url: string | null;
        created_at: string;
      } | null;
      error: { message: string } | null;
    }

    interface ProfilesClient {
      update: (d: { full_name: string; avatar_url: string | null }) => {
        eq: (k: string, v: string) => {
          select: () => {
            single: () => Promise<ProfilesUpdateResult>;
          };
        };
      };
    }

    const { data, error } = await (supabase
      .from('profiles') as unknown as ProfilesClient)
      .update({
        full_name: fullName,
        avatar_url: avatarUrl,
      })
      .eq('id', user.id)
      .select()
      .single();

    if (error) {
      return { error: error.message };
    }

    // Also update auth.users metadata so client sessions are in sync if needed
    await supabase.auth.updateUser({
      data: {
        full_name: fullName,
        avatar_url: avatarUrl,
      }
    } as unknown as never);

    revalidatePath('/', 'layout');
    return { success: true, data };
  } catch (err: unknown) {
    return { error: err instanceof Error ? err.message : 'An unexpected error occurred' };
  }
}

