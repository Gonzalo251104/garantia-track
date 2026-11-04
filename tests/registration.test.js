import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAccount, registrationConfirmation } from '../dist/registration.js';

test('registration without a session shows the same next step for new and obfuscated accounts', async () => {
  for (const user of [{ id: 'new-account' }, { identities: [] }, null]) {
    const result = await registerAccount({ signUp: async () => ({ data: { user, session: null }, error: null }) }, {}, () => true);
    assert.deepEqual(result, { state: 'confirmation' });
  }
  const markup = registrationConfirmation();
  assert.ok(markup.includes('aria-labelledby="registration-title"'));
  assert.ok(markup.includes('tabindex="-1"'));
  assert.ok(markup.includes('data-auth="login"'));
  assert.ok(markup.includes('data-auth="register"'));
  assert.equal(/<form|type="password"|type="email"/.test(markup), false);
  assert.equal(/correo enviado|cuenta creada|new-account/i.test(markup), false);
});

test('registration preserves the SDK request and a returned session without a second signup', async () => {
  const credentials = { email: 'fictional@example.invalid', password: 'fictional-only', options: { emailRedirectTo: 'https://example.invalid/' } };
  const session = { user: { id: 'fictional-user' } };
  let calls = 0;
  const result = await registerAccount({ signUp: async input => {
    calls++;
    assert.equal(input, credentials);
    return { data: { session }, error: null };
  } }, credentials, () => true);
  assert.equal(calls, 1);
  assert.deepEqual(result, { state: 'signed-in', session });
});

test('provider failures never produce registration confirmation', async () => {
  for (const error of [{ status: 429 }, new Error('Network failure')]) {
    await assert.rejects(registerAccount({ signUp: async () => ({ data: null, error }) }, {}, () => true), value => value === error);
  }
  await assert.rejects(registerAccount({ signUp: async () => { throw new Error('Offline'); } }, {}, () => true), /Offline/);
});

test('a late registration result cannot replace a different view', async () => {
  let finish, current = true;
  const pending = registerAccount({ signUp: () => new Promise(resolve => { finish = resolve; }) }, {}, () => current);
  current = false;
  finish({ data: { session: null }, error: null });
  assert.deepEqual(await pending, { state: 'stale' });
});
