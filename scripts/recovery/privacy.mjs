import { RecoveryFailure } from './diagnostics.mjs';

// Read metadata only. Never probe permissions by exporting a secret first.
export const privacyQuery = `select
  current_setting('log_parameter_max_length') = '0' as parameters_suppressed,
  current_setting('log_parameter_max_length_on_error') = '0' as errors_suppressed,
  has_parameter_privilege(current_user,'log_parameter_max_length','SET') as can_set_parameters,
  has_parameter_privilege(current_user,'log_parameter_max_length_on_error','SET') as can_set_errors`;

export async function inspectParameterPrivacy(db) {
  const { rows } = await db.query(privacyQuery);
  if (rows.length !== 1 || !['parameters_suppressed', 'errors_suppressed', 'can_set_parameters', 'can_set_errors']
    .every(key => typeof rows[0]?.[key] === 'boolean')) {
    throw new RecoveryFailure('PRIVACY_VERIFY');
  }
  const row = rows[0];
  return {
    parametersSuppressed: row.parameters_suppressed,
    errorsSuppressed: row.errors_suppressed,
    canConfigure: (row.parameters_suppressed || row.can_set_parameters)
      && (row.errors_suppressed || row.can_set_errors),
    canSetParameters: row.can_set_parameters,
    canSetErrors: row.can_set_errors
  };
}

export async function ensureParameterPrivacy(db) {
  const before = await inspectParameterPrivacy(db);
  if (!before.canConfigure) throw new RecoveryFailure('PRIVACY_PERMISSION');
  // Already-protected sessions do not require privileged SET commands.
  if (!before.parametersSuppressed) await db.query('set log_parameter_max_length=0');
  if (!before.errorsSuppressed) await db.query('set log_parameter_max_length_on_error=0');
  const after = await inspectParameterPrivacy(db);
  if (!after.parametersSuppressed || !after.errorsSuppressed) throw new RecoveryFailure('PRIVACY_VERIFY');
}
