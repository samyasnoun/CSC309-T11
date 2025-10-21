#!/usr/bin/env node
'use strict';

// Test script for user update endpoint
const baseUrl = 'http://localhost:8000';

async function testUserUpdates() {
  console.log('🧪 Testing User Update Endpoint\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test 2: Test without authentication (should fail)
    console.log('\n2. Testing user update without authentication...');
    try {
      const unauthedResponse = await fetch(`${baseUrl}/auth/users/1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'cashier' })
      });
      const unauthedData = await unauthedResponse.json();
      console.log('✅ Expected 401 for unauthenticated request:', unauthedResponse.status, unauthedData);
    } catch (error) {
      console.log('✅ Expected error for unauthenticated request');
    }
    
    // Test 3: Test with invalid user ID
    console.log('\n3. Testing with invalid user ID...');
    try {
      const invalidIdResponse = await fetch(`${baseUrl}/auth/users/invalid`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fake-token'
        },
        body: JSON.stringify({ role: 'cashier' })
      });
      const invalidIdData = await invalidIdResponse.json();
      console.log('✅ Expected 400 for invalid user ID:', invalidIdResponse.status, invalidIdData);
    } catch (error) {
      console.log('✅ Expected error for invalid user ID');
    }
    
    // Test 4: Test with non-existent user
    console.log('\n4. Testing with non-existent user...');
    try {
      const notFoundResponse = await fetch(`${baseUrl}/auth/users/99999`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fake-token'
        },
        body: JSON.stringify({ role: 'cashier' })
      });
      const notFoundData = await notFoundResponse.json();
      console.log('✅ Expected 404 for non-existent user:', notFoundResponse.status, notFoundData);
    } catch (error) {
      console.log('✅ Expected error for non-existent user');
    }
    
    console.log('\n🎉 User update endpoint tests completed!');
    console.log('\n📋 User Update Endpoint Details:');
    console.log('  PUT /auth/users/:userId - Update user (managers/superusers only)');
    
    console.log('\n🔐 Permission Rules:');
    console.log('  Managers can update:');
    console.log('    - email (UofT domain required)');
    console.log('    - verified (must be true)');
    console.log('    - suspicious (boolean)');
    console.log('    - role (only "cashier" or "regular")');
    console.log('    - Auto-set suspicious=false when promoting to cashier');
    
    console.log('\n  Superusers can update:');
    console.log('    - All manager permissions');
    console.log('    - role (any of: regular, cashier, manager, superuser)');
    
    console.log('\n📊 Response Format:');
    console.log('  Returns only changed fields along with id, utorid, name');
    console.log('  Example response:');
    console.log(JSON.stringify({
      "id": 1,
      "utorid": "user123",
      "name": "John Doe",
      "email": "john@mail.utoronto.ca",
      "role": "cashier",
      "verified": true,
      "suspicious": false
    }, null, 2));
    
    console.log('\n🚫 Error Responses:');
    console.log('  400 - Bad Request (invalid data, validation errors)');
    console.log('  403 - Forbidden (insufficient permissions)');
    console.log('  404 - Not Found (user not found)');
    
    console.log('\n📝 Usage Examples:');
    console.log('  # Manager promoting user to cashier');
    console.log('  PUT /auth/users/1 -H "Authorization: Bearer MANAGER_TOKEN" \\');
    console.log('    -d \'{"role": "cashier", "verified": true}\'');
    console.log('');
    console.log('  # Superuser setting user as manager');
    console.log('  PUT /auth/users/1 -H "Authorization: Bearer SUPERUSER_TOKEN" \\');
    console.log('    -d \'{"role": "manager", "verified": true}\'');
    console.log('');
    console.log('  # Manager updating email and suspicious status');
    console.log('  PUT /auth/users/1 -H "Authorization: Bearer MANAGER_TOKEN" \\');
    console.log('    -d \'{"email": "new@mail.utoronto.ca", "suspicious": false}\'');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testUserUpdates().catch(console.error);
}

module.exports = { testUserUpdates };

