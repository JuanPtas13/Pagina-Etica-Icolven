interface ErrorLike {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
}

function asErrorLike(err: unknown): ErrorLike {
  if (typeof err === 'object' && err !== null) return err as ErrorLike;
  if (typeof err === 'string') return { message: err };
  return {};
}

/**
 * Traduce errores de Supabase/PostgREST/Auth/Storage a mensajes comprensibles
 * sin revelar nombres de tablas, políticas ni detalles internos.
 * El detalle técnico solo va a la consola del desarrollador.
 */
export function explainError(err: unknown, fallback = 'Ocurrió un error inesperado. Inténtalo de nuevo.'): string {
  const e = asErrorLike(err);
  const msg = (e.message ?? '').toLowerCase();

  if (import.meta.env.DEV) console.error('[error]', err);

  if (msg.includes('failed to fetch') || msg.includes('networkerror') || msg.includes('network request failed')) {
    return 'No se pudo conectar con el servidor. Revisa tu conexión a internet e inténtalo de nuevo.';
  }
  if (msg.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos.';
  if (msg.includes('email not confirmed')) {
    return 'Aún no has confirmado tu correo electrónico. Revisa tu bandeja de entrada (y la carpeta de spam).';
  }
  if (msg.includes('user already registered') || msg.includes('already been registered')) {
    return 'Ya existe una cuenta con ese correo. Prueba iniciando sesión.';
  }
  if (msg.includes('rate limit') || e.status === 429) {
    return 'Has hecho demasiados intentos. Espera unos minutos antes de volver a intentarlo.';
  }
  if (msg.includes('password') && (msg.includes('weak') || msg.includes('at least') || msg.includes('characters'))) {
    return 'La contraseña no cumple los requisitos de seguridad. Usa al menos 8 caracteres.';
  }
  if (msg.includes('jwt expired') || msg.includes('invalid jwt') || msg.includes('refresh token') || e.status === 401) {
    return 'Tu sesión ha expirado. Vuelve a iniciar sesión.';
  }
  if (e.code === '42501' || msg.includes('row-level security') || msg.includes('permission denied') || e.status === 403) {
    return 'No tienes permiso para realizar esta acción. Si crees que es un error, comprueba que tu cuenta esté activa.';
  }
  if (e.code === '23505' || msg.includes('duplicate key')) {
    return msg.includes('slug') || msg.includes('projects_slug')
      ? 'Ya existe un proyecto con ese slug. Elige otro.'
      : 'Ese registro ya existe.';
  }
  if (e.code === '23502') return 'Falta completar un dato obligatorio. Revisa la información del formulario.';
  if (e.code === '23503') return 'La categoría seleccionada ya no existe o no se puede usar. Vuelve a seleccionarla.';
  if (e.code === '23514' || e.code === '22P02') return 'El estado o alguno de los datos enviados no es válido.';
  if (e.code === 'PGRST204' || e.code === 'PGRST205' || e.code === '42703' || e.code === '42P01') {
    return 'La estructura de la base de datos no coincide con la aplicación. Actualiza el esquema de Supabase y vuelve a intentarlo.';
  }
  if (e.code === 'PGRST116' || msg.includes('not found') || msg.includes('object not found')) {
    return 'No se encontró el elemento solicitado.';
  }
  if (e.status === 400) {
    return 'Supabase rechazó los datos enviados. Revisa los campos e inténtalo de nuevo; consulta el detalle técnico en la consola del navegador.';
  }
  if (msg.includes('exceeded the maximum allowed size') || msg.includes('payload too large') || e.status === 413) {
    return 'El archivo supera el tamaño máximo permitido.';
  }
  if (msg.includes('mime type') || msg.includes('not supported')) return 'El formato del archivo no está admitido.';
  return fallback;
}

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

/** Convierte cualquier error en un AppError con mensaje apto para el usuario. */
export function toAppError(err: unknown, fallback?: string): AppError {
  if (err instanceof AppError) return err;
  return new AppError(explainError(err, fallback));
}
