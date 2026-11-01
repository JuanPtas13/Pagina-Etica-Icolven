import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import { toAppError } from '../lib/errors';
import type { Profile } from '../types/database';

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** true mientras se restaura la sesión o se consulta el perfil */
  loading: boolean;
  /** Error al consultar el perfil. Un error NUNCA equivale a autorización. */
  profileError: string | null;
  emailConfirmed: boolean;
  /** Miembro (o profesor) con perfil activo y correo confirmado. La base de datos decide en última instancia. */
  canParticipate: boolean;
  isTeacher: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (displayName: string, email: string, password: string) => Promise<{ needsConfirmation: boolean }>;
  signOut: () => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);

  // 1) Restaurar sesión y escuchar cambios. No se hacen llamadas a Supabase dentro del callback.
  useEffect(() => {
    let active = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (active) setSession(data.session);
      })
      .catch(() => {
        if (active) setSession(null);
      })
      .finally(() => {
        if (active) setSessionLoading(false);
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setSessionLoading(false);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const userId = session?.user.id ?? null;

  const loadProfile = useCallback(async (id: string) => {
    setProfileLoading(true);
    setProfileError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, role, status, avatar_path, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      setProfile(null);
      setProfileError(toAppError(error, 'No se pudo consultar tu perfil.').message);
    } else if (!data) {
      setProfile(null);
      setProfileError('Tu cuenta todavía no tiene un perfil asociado. Inténtalo de nuevo en unos segundos.');
    } else {
      setProfile(data as Profile);
    }
    setProfileLoading(false);
  }, []);

  // 2) Cargar el perfil cuando cambia el usuario.
  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfileError(null);
      setProfileLoading(false);
      return;
    }
    void loadProfile(userId);
  }, [userId, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (userId) await loadProfile(userId);
  }, [userId, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw toAppError(error, 'No se pudo iniciar sesión.');
  }, []);

  const signUp = useCallback(async (displayName: string, email: string, password: string) => {
    // El rol NUNCA se envía desde el cliente: lo asigna el disparador de la base de datos (siempre "member").
    // El perfil lo crea el disparador `handle_new_user`; no se inserta manualmente.
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { display_name: displayName.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw toAppError(error, 'No se pudo crear la cuenta.');
    // Con confirmación activada, un correo ya registrado devuelve un usuario sin identidades.
    if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      throw toAppError({ message: 'User already registered' });
    }
    return { needsConfirmation: !data.session };
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      // Aunque falle la revocación remota, se limpia la sesión local para que no se sigan usando funciones autenticadas.
      await supabase.auth.signOut({ scope: 'local' });
    }
    setProfile(null);
    setSession(null);
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) throw toAppError(error, 'No se pudo reenviar el correo de confirmación.');
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/restablecer`,
    });
    if (error) throw toAppError(error, 'No se pudo enviar el correo de recuperación.');
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw toAppError(error, 'No se pudo actualizar la contraseña.');
  }, []);

  const user = session?.user ?? null;
  // Mientras haya usuario pero el perfil todavía no haya respondido (ni con datos ni con error),
  // se considera "cargando": así nunca se muestra un estado de "sin permisos" transitorio.
  const awaitingProfile = Boolean(userId) && !profile && !profileError;
  const emailConfirmed = Boolean(user?.email_confirmed_at);
  const canParticipate = Boolean(user && emailConfirmed && profile && profile.status === 'active');
  const isTeacher = Boolean(user && emailConfirmed && profile && profile.status === 'active' && profile.role === 'teacher');

  const value = useMemo<AuthState>(
    () => ({
      session,
      user,
      profile,
      loading: sessionLoading || profileLoading || awaitingProfile,
      profileError,
      emailConfirmed,
      canParticipate,
      isTeacher,
      signIn,
      signUp,
      signOut,
      resendConfirmation,
      requestPasswordReset,
      updatePassword,
      refreshProfile,
    }),
    [
      session, user, profile, sessionLoading, profileLoading, awaitingProfile, profileError, emailConfirmed,
      canParticipate, isTeacher, signIn, signUp, signOut, resendConfirmation, requestPasswordReset,
      updatePassword, refreshProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
