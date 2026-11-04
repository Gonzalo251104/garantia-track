export async function registerAccount(auth, credentials, isCurrent) {
  const { data, error } = await auth.signUp(credentials);
  if (error) throw error;
  if (!isCurrent()) return { state: 'stale' };
  return data?.session
    ? { state: 'signed-in', session: data.session }
    : { state: 'confirmation' };
}

export function registrationConfirmation() {
  return `<section class="panel registration-confirmation" aria-labelledby="registration-title">
    <div class="section">
      <div class="eyebrow">SOLICITUD RECIBIDA</div>
      <h1 id="registration-title" tabindex="-1">Revisa tu correo</h1>
      <p role="status">Si el registro está disponible para ese correo, recibirás un enlace para confirmar tu cuenta.</p>
      <ol><li>Busca el correo de confirmación. Revisa también la carpeta de spam.</li><li>Abre el enlace de confirmación y después inicia sesión.</li></ol>
      <p>¿Ya tenías una cuenta? Puedes iniciar sesión con tu contraseña.</p>
      <div class="actions-stack"><button type="button" class="primary" data-auth="login">Ir a iniciar sesión</button><button type="button" class="secondary" data-auth="register">Usar otro correo</button></div>
    </div>
  </section>`;
}
