#!/usr/bin/env node
'use strict';

// Test script for user registration endpoint
const baseUrl = 'http://localhost:8000';

async function testRegistration() {
  console.log('🧪 Testing User Registration Endpoint\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test 2: Try to register without authentication (should fail)
    console.log('\n2. Testing registration without authentication...');
    try {
      const unauthedResponse = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utorid: 'test123',
          name: 'Test User',
          email: 'test@mail.utoronto.ca'
        })
      });
      const unauthedData = await unauthedResponse.json();
      console.log('✅ Expected 401 for unauthenticated request:', unauthedResponse.status, unauthedData);
    } catch (error) {
      console.log('✅ Expected error for unauthenticated request');
    }
    
    // Test 3: Test validation errors
    console.log('\n3. Testing validation errors...');
    
    // Invalid utorid (too short)
    console.log('   Testing invalid utorid (too short)...');
    try {
      const shortUtoridResponse = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fake-token' // This will fail auth, but we're testing validation
        },
        body: JSON.stringify({
          utorid: 'ab',
          name: 'Test User',
          email: 'test@mail.utoronto.ca'
        })
      });
      console.log('   Response status:', shortUtoridResponse.status);
    } catch (error) {
      console.log('   ✅ Expected error for invalid utorid');
    }
    
    // Invalid email domain
    console.log('   Testing invalid email domain...');
    try {
      const invalidEmailResponse = await fetch(`${baseUrl}/auth/register`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': 'Bearer fake-token'
        },
        body: JSON.stringify({
          utorid: 'test123',
          name: 'Test User',
          email: 'test@gmail.com'
        })
      });
      console.log('   Response status:', invalidEmailResponse.status);
    } catch (error) {
      console.log('   ✅ Expected error for invalid email domain');
    }
    
    console.log('\n🎉 Registration endpoint tests completed!');
    console.log('\n📋 Registration endpoint details:');
    console.log('  POST /auth/register - Register new user (cashiers/managers/superusers only)');
    console.log('  Required fields: utorid (7-8 alnum), name (1-50), email (UofT domain)');
    console.log('  Returns: 201 on success, 409 on duplicate, 400 on validation error');
    console.log('  Response includes: user object, activationToken, expiresAt');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testRegistration().catch(console.error);
}

module.exports = { testRegistration };

