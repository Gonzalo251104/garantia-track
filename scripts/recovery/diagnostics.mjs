const stages = new Set(['arguments', 'archive-location', 'connection-settings', 'secret-input', 'archive-read',
  'certificate-read', 'database-connect', 'privacy-setup', 'export-record', 'archive-write', 'restore-record']);
const reasons = {
  USAGE: 'Use backup|restore-lab followed by one archive path outside the repository.',
  TERMINAL: 'Run from an interactive PowerShell terminal.',
  ARCHIVE_LOCATION: 'Choose an existing private directory outside the repository.',
  PROJECT: 'Enter the exact project reference shown in the prompt.',
  ENDPOINT: 'Use the expected project hostname/user and port 5432. Enter fields separately, without a connection URL.',
  PASSPHRASE_LENGTH: 'Use a backup passphrase of at least 16 characters.',
  PASSPHRASE_CONFIRMATION: 'The backup passphrase confirmation did not match. Enter it again privately.',
  CANCELLED: 'The operator cancelled the command.',
  ARCHIVE_LIMIT: 'This drill accepts only a small GT-1044 recovery archive.',
  PRIVACY_PERMISSION: 'Required parameter-log protection is unavailable to this database role. Stop before reading or restoring secrets; use a provider-supported protected session or an isolated destination. Do not bypass the guard or grant privileges automatically.',
  PRIVACY_VERIFY: 'Required parameter-log protection could not be verified. No secret export or restore is allowed.',
};
const fallback = {
  arguments: 'Check the command format and use an interactive terminal.',
  'archive-location': 'Check that the private parent directory exists and is accessible.',
  'connection-settings': 'Check the project reference and separate session-pooler connection fields.',
  'secret-input': 'Retry the hidden prompts privately; never put passwords in the command.',
  'archive-read': 'Check archive access, format and passphrase; an authentication failure can also mean file damage.',
  'certificate-read': 'Check the provider CA certificate path and file access.',
  'database-connect': 'Check network access, database password and provider certificate trust. Keep TLS verification enabled.',
  'privacy-setup': 'The session could not configure parameter-log suppression. Keep this protection; verify provider role permissions before continuing.',
  'export-record': 'Check source permissions and that the scoped tracking record has an available, valid Vault value.',
  'archive-write': 'Check output access and free space. Existing archives are not overwritten; choose a new filename.',
  'restore-record': 'Check the lab record, permissions, hash, exact expiry and missing Vault reference. Revoked, expired or already recovered links are rejected.',
};
export class RecoveryFailure extends Error {
  constructor(reason) { super('Recovery precondition failed'); this.reason = reason; }
}
export function safeDiagnostic(error, stage) {
  const safeStage = stages.has(stage) ? stage : 'arguments';
  let code = 'CHECK_STAGE';
  let action = fallback[safeStage];
  if (error instanceof RecoveryFailure && Object.hasOwn(reasons, error.reason)) {
    code = error.reason; action = reasons[error.reason];
  } else if (safeStage === 'database-connect') {
    if (error?.code === '28P01') {
      code = 'AUTHENTICATION'; action = 'Database authentication failed. Verify the database password privately; this is not the Supabase account password.';
    } else if (['ENOTFOUND', 'EAI_AGAIN', 'ECONNREFUSED', 'ETIMEDOUT', 'ENETUNREACH', 'EHOSTUNREACH'].includes(error?.code)) {
      code = 'NETWORK'; action = 'Check the hostname, DNS, network and port 5432. Retry once connectivity is available.';
    } else if (['SELF_SIGNED_CERT_IN_CHAIN', 'DEPTH_ZERO_SELF_SIGNED_CERT', 'UNABLE_TO_VERIFY_LEAF_SIGNATURE', 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY', 'CERT_HAS_EXPIRED', 'ERR_TLS_CERT_ALTNAME_INVALID'].includes(error?.code)) {
      code = 'TLS_TRUST'; action = 'Verify the hostname and provider CA certificate. Keep certificate verification enabled.';
    }
  } else if (error?.code === '42501') {
    code = 'PERMISSION';
  } else if (safeStage === 'archive-write' && error?.code === 'EEXIST') {
    code = 'OUTPUT_EXISTS';
  }
  // Never include provider messages, paths, query parameters, stack traces or error details.
  return `[GT-RECOVERY:${code}] Stage: ${safeStage}. ${action}`;
}
