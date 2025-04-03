import { createClient } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type SignUpData = {
  email: string;
  password: string;
  inviteCode?: string;
};

export type SignInData = {
  email: string;
  password: string;
};

export async function signUp({ email, password, inviteCode }: SignUpData) {
  try {
    // First validate the invite code
    const { data: validationData, error: validationError } = await supabase
      .rpc('validate_invite_code', {
        p_email: email,
        p_invite_code: inviteCode
      });

    if (validationError) {
      throw validationError;
    }

    const organization_id = validationData;

    // Sign up the user
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          organization_id,
          role: 'employee' // Default role for new signups
        }
      }
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error during signup:', error);
    throw error;
  }
}

export async function signIn({ email, password }: SignInData) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        persistSession: true // Enable persistent sessions
      }
    });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error during sign in:', error);
    throw error;
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error during sign out:', error);
    throw error;
  }
}

export async function getCurrentUser() {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting current user:', error);
      return null; // Return null instead of throwing error when no session exists
    }

    return user;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null; // Return null for any other errors
  }
}