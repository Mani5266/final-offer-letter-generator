import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

// Initialize Supabase Client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function login(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  } catch (err) {
    const errEl = document.getElementById('authError');
    if (errEl) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
    return null;
  }
}

export async function signup(email, password, fullName) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });
    if (error) throw error;
    return data;
  } catch (err) {
    const errEl = document.getElementById('authError');
    if (errEl) {
      errEl.textContent = err.message;
      errEl.style.display = 'block';
    }
    return null;
  }
}

export async function logout() {
  await supabase.auth.signOut();
  localStorage.removeItem('oneasy_user');
  window.location.reload();
}

export async function checkSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session ? session.user : null;
}

export { supabase };
