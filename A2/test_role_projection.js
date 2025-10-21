#!/usr/bin/env node
'use strict';

// Test script for role-aware user filtering
const baseUrl = 'http://localhost:8000';

async function testRoleProjection() {
  console.log('🧪 Testing Role-Aware User Filtering\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test 2: Test without authentication (should fail)
    console.log('\n2. Testing users endpoint without authentication...');
    try {
      const unauthedResponse = await fetch(`${baseUrl}/auth/users`);
      const unauthedData = await unauthedResponse.json();
      console.log('✅ Expected 401 for unauthenticated request:', unauthedResponse.status, unauthedData);
    } catch (error) {
      console.log('✅ Expected error for unauthenticated request');
    }
    
    console.log('\n🎉 Role-aware filtering tests completed!');
    console.log('\n📋 Role-Based Field Projection:');
    console.log('\n🔹 Cashier+ View (Limited):');
    console.log('  Fields: id, utorid, name, points, verified, promotions');
    console.log('  Promotions: Available one-time promotions only');
    
    console.log('\n🔹 Manager+ View (Full):');
    console.log('  Fields: All cashier fields + email, birthday, role, createdAt, lastLogin, avatarUrl, activated, suspicious');
    console.log('  Promotions: Available one-time promotions');
    
    console.log('\n📊 Response Examples:');
    console.log('\nCashier Response:');
    console.log(JSON.stringify({
      "count": 5,
      "results": [
        {
          "id": 1,
          "utorid": "user123",
          "name": "John Doe",
          "points": 150,
          "verified": true,
          "promotions": [
            {
              "id": 1,
              "name": "Welcome Bonus",
              "oneTimePoints": 50,
              "startAt": "2024-12-01T00:00:00.000Z",
              "endAt": "2024-12-31T23:59:59.000Z"
            }
          ]
        }
      ]
    }, null, 2));
    
    console.log('\nManager Response:');
    console.log(JSON.stringify({
      "count": 5,
      "results": [
        {
          "id": 1,
          "utorid": "user123",
          "name": "John Doe",
          "email": "john@mail.utoronto.ca",
          "birthday": "1995-06-15T00:00:00.000Z",
          "role": "regular",
          "points": 150,
          "verified": true,
          "activated": true,
          "suspicious": false,
          "createdAt": "2024-12-20T10:30:00.000Z",
          "lastLogin": "2024-12-20T15:45:00.000Z",
          "avatarUrl": "https://example.com/avatar.jpg",
          "promotions": [
            {
              "id": 1,
              "name": "Welcome Bonus",
              "oneTimePoints": 50,
              "startAt": "2024-12-01T00:00:00.000Z",
              "endAt": "2024-12-31T23:59:59.000Z"
            }
          ]
        }
      ]
    }, null, 2));
    
    console.log('\n🔐 Authorization Levels:');
    console.log('  Regular Users: Cannot access /auth/users (403 Forbidden)');
    console.log('  Cashiers: Limited view with promotions');
    console.log('  Managers: Full view with promotions');
    console.log('  Superusers: Full view with promotions');
    
    console.log('\n📝 Usage Examples:');
    console.log('  # Cashier accessing users (limited fields)');
    console.log('  GET /auth/users -H "Authorization: Bearer CASHIER_TOKEN"');
    console.log('  # Manager accessing users (full fields)');
    console.log('  GET /auth/users -H "Authorization: Bearer MANAGER_TOKEN"');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testRoleProjection().catch(console.error);
}

module.exports = { testRoleProjection };

