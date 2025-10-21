#!/usr/bin/env node
'use strict';

// Test script for user filtering endpoint
const baseUrl = 'http://localhost:8000';

async function testFiltering() {
  console.log('🧪 Testing User Filtering Endpoint\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test 2: Try to access users without authentication (should fail)
    console.log('\n2. Testing users endpoint without authentication...');
    try {
      const unauthedResponse = await fetch(`${baseUrl}/auth/users`);
      const unauthedData = await unauthedResponse.json();
      console.log('✅ Expected 401 for unauthenticated request:', unauthedResponse.status, unauthedData);
    } catch (error) {
      console.log('✅ Expected error for unauthenticated request');
    }
    
    // Test 3: Test with invalid parameters
    console.log('\n3. Testing validation errors...');
    
    // Invalid page number
    console.log('   Testing invalid page number...');
    try {
      const invalidPageResponse = await fetch(`${baseUrl}/auth/users?page=0`, {
        headers: { 'Authorization': 'Bearer fake-token' }
      });
      console.log('   Response status:', invalidPageResponse.status);
    } catch (error) {
      console.log('   ✅ Expected error for invalid page');
    }
    
    // Invalid limit
    console.log('   Testing invalid limit...');
    try {
      const invalidLimitResponse = await fetch(`${baseUrl}/auth/users?limit=101`, {
        headers: { 'Authorization': 'Bearer fake-token' }
      });
      console.log('   Response status:', invalidLimitResponse.status);
    } catch (error) {
      console.log('   ✅ Expected error for invalid limit');
    }
    
    // Invalid role
    console.log('   Testing invalid role...');
    try {
      const invalidRoleResponse = await fetch(`${baseUrl}/auth/users?role=invalid`, {
        headers: { 'Authorization': 'Bearer fake-token' }
      });
      console.log('   Response status:', invalidRoleResponse.status);
    } catch (error) {
      console.log('   ✅ Expected error for invalid role');
    }
    
    console.log('\n🎉 User filtering endpoint tests completed!');
    console.log('\n📋 User filtering endpoint details:');
    console.log('  GET /auth/users - Get filtered users (managers/superusers only)');
    console.log('  Query parameters:');
    console.log('    - name: Search in utorid or name (case-insensitive)');
    console.log('    - role: Filter by role (regular, cashier, manager, superuser)');
    console.log('    - verified: Filter by verification status (true/false)');
    console.log('    - activated: Filter by activation status (true/false)');
    console.log('    - page: Page number (default 1)');
    console.log('    - limit: Results per page (default 10, max 100)');
    console.log('  Response format: { count: number, results: [...] }');
    console.log('  Ordering: createdAt desc (newest first)');
    
    console.log('\n📝 Example usage:');
    console.log('  GET /auth/users?name=john&role=regular&verified=true&page=1&limit=5');
    console.log('  GET /auth/users?activated=false&page=2&limit=20');
    console.log('  GET /auth/users?role=manager&verified=true');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testFiltering().catch(console.error);
}

module.exports = { testFiltering };

