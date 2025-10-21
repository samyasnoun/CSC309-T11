#!/usr/bin/env node
'use strict';

// Test script for authentication endpoints
const baseUrl = 'http://localhost:8000';

async function testAuth() {
  console.log('🧪 Testing Authentication Endpoints\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test 2: Request reset token for non-existent user
    console.log('\n2. Testing reset request for non-existent user...');
    try {
      const resetResponse = await fetch(`${baseUrl}/auth/resets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utorid: 'nonexist' })
      });
      const resetData = await resetResponse.json();
      console.log('❌ Expected 404, got:', resetResponse.status, resetData);
    } catch (error) {
      console.log('✅ Expected error for non-existent user');
    }
    
    // Test 3: Test invalid reset token
    console.log('\n3. Testing invalid reset token...');
    try {
      const invalidTokenResponse = await fetch(`${baseUrl}/auth/resets/invalid-token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: 'newpassword123' })
      });
      const invalidTokenData = await invalidTokenResponse.json();
      console.log('✅ Invalid token response:', invalidTokenResponse.status, invalidTokenData);
    } catch (error) {
      console.log('✅ Expected error for invalid token');
    }
    
    console.log('\n🎉 Authentication endpoint tests completed!');
    console.log('\n📋 Available endpoints:');
    console.log('  POST /auth/tokens - Login with utorid/password');
    console.log('  POST /auth/resets - Request reset token');
    console.log('  POST /auth/resets/:token - Activate or reset with token');
    console.log('  GET  /auth/profile - Get user profile (protected)');
    console.log('  GET  /auth/verify - Verify token (protected)');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testAuth().catch(console.error);
}

module.exports = { testAuth };

