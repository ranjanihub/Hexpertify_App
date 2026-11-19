async function runTests(): Promise<void> {
  const baseUrl = 'http://localhost:5000';
  console.log('=== RUNNING AUTHENTICATION SECURITY TESTS ===\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}: ${detail || 'Assertion failed'}`);
      failed++;
    }
  }

  // 1. Client login with WRONG password
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ranjaniranjani5694@gmail.com',
        password: 'wrong_password_9999',
        role: 'client'
      })
    });
    const data: any = await res.json();
    assert(res.status === 401 && data.success === false, 'Client login with WRONG password rejected with 401', `Status ${res.status}, body: ${JSON.stringify(data)}`);
  } catch (err: any) {
    assert(false, 'Client login with WRONG password', err.message);
  }

  // 2. Client login with CORRECT password
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'ranjaniranjani5694@gmail.com',
        password: 'password123',
        role: 'client'
      })
    });
    const data: any = await res.json();
    assert(res.status === 200 && data.success === true && !!data.ssoTicket, 'Client login with CORRECT password returns 200 and ssoTicket', `Status ${res.status}`);
  } catch (err: any) {
    assert(false, 'Client login with CORRECT password', err.message);
  }

  // 3. Therapist login with WRONG password
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dr.evelyn@hexpertify.com',
        password: 'wrong_doctor_password',
        role: 'therapist'
      })
    });
    const data: any = await res.json();
    assert(res.status === 401 && data.success === false, 'Therapist login with WRONG password rejected with 401', `Status ${res.status}`);
  } catch (err: any) {
    assert(false, 'Therapist login with WRONG password', err.message);
  }

  // 4. Therapist login with CORRECT password
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'dr.evelyn@hexpertify.com',
        password: 'password123',
        role: 'therapist'
      })
    });
    const data: any = await res.json();
    assert(res.status === 200 && data.success === true, 'Therapist login with CORRECT password returns 200', `Status ${res.status}`);
  } catch (err: any) {
    assert(false, 'Therapist login with CORRECT password', err.message);
  }

  // 5. Admin login with WRONG password
  try {
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@hexpertify.com',
        password: 'wrong_admin_password',
        role: 'admin'
      })
    });
    const data: any = await res.json();
    assert(res.status === 401 && data.success === false, 'Admin login with WRONG password rejected with 401', `Status ${res.status}`);
  } catch (err: any) {
    assert(false, 'Admin login with WRONG password', err.message);
  }

  // 6. Registration with DUPLICATE email (existing user)
  try {
    const res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Ranjani Imposter',
        email: 'ranjaniranjani5694@gmail.com',
        password: 'newpassword123',
        role: 'client'
      })
    });
    const data: any = await res.json();
    assert(res.status === 409 && data.success === false, 'Registration with DUPLICATE email rejected with 409 Conflict', `Status ${res.status}, body: ${JSON.stringify(data)}`);
  } catch (err: any) {
    assert(false, 'Registration with DUPLICATE email', err.message);
  }

  // 7. Non-existent email on LOGIN does NOT create account (must return 401)
  try {
    const nonExistentEmail = `ghost.${Date.now()}@hexpertify.com`;
    const res = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: nonExistentEmail,
        password: 'any_password',
        role: 'client'
      })
    });
    const data: any = await res.json();
    assert(res.status === 401 && data.success === false, 'Login with non-existent email rejected with 401 (does NOT create user)', `Status ${res.status}`);
  } catch (err: any) {
    assert(false, 'Login with non-existent email', err.message);
  }

  // 8. Register a brand new unique user
  const newEmail = `verify.${Date.now()}@hexpertify.com`;
  const newPass = 'securePass987!';
  try {
    const res = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Verification User',
        email: newEmail,
        password: newPass,
        phone: '+91 9988776655',
        role: 'client'
      })
    });
    const data: any = await res.json();
    assert(res.status === 201 && data.success === true, 'New unique client registration returns 201 Created', `Status ${res.status}`);

    // Immediately try to register the exact same email again
    const dupRes = await fetch(`${baseUrl}/api/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Verification User Clone',
        email: newEmail,
        password: 'anotherPassword',
        role: 'client'
      })
    });
    const dupData: any = await dupRes.json();
    assert(dupRes.status === 409 && dupData.success === false, 'Immediate duplicate registration of same email rejected with 409', `Status ${dupRes.status}`);

    // Try logging in with wrong password
    const wrongLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newEmail,
        password: 'wrongPasswordHere',
        role: 'client'
      })
    });
    assert(wrongLoginRes.status === 401, 'New user login with WRONG password rejected with 401', `Status ${wrongLoginRes.status}`);

    // Try logging in with correct password
    const correctLoginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newEmail,
        password: newPass,
        role: 'client'
      })
    });
    const correctData: any = await correctLoginRes.json();
    assert(correctLoginRes.status === 200 && correctData.success === true, 'New user login with CORRECT password succeeds with 200', `Status ${correctLoginRes.status}`);
  } catch (err: any) {
    assert(false, 'New user lifecycle test', err.message);
  }

  console.log(`\n=== RESULTS: ${passed} PASSED, ${failed} FAILED ===`);
}

runTests().catch(console.error);
export {};
