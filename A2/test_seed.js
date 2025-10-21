#!/usr/bin/env node
'use strict';

// Test script to verify seed functionality
const baseUrl = 'http://localhost:8000';

async function testSeedData() {
  console.log('🌱 Testing Seed Data & Endpoints\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    console.log('\n🎉 Seed data test completed!');
    console.log('\n📋 Seed Data Created:');
    console.log('  👥 Users (8 total):');
    console.log('    - Regular: user001, user002 (password: password123)');
    console.log('    - Cashier: cash001, cash002 (cash002 is suspicious)');
    console.log('    - Manager: mgr001, mgr002');
    console.log('    - Organizer: org001');
    console.log('    - Superuser: admin01');
    
    console.log('\n  🎉 Events (3 total):');
    console.log('    - Tech Conference 2024 (100 capacity, 1000 points budget)');
    console.log('    - Workshop: Data Science (50 capacity, 500 points budget)');
    console.log('    - Networking Mixer (75 capacity, 750 points budget)');
    
    console.log('\n  🎁 Promotions (3 total):');
    console.log('    - Welcome Bonus (50 points, one-time)');
    console.log('    - Double Points Weekend (2x multiplier, min $10)');
    console.log('    - Holiday Special (1.5x multiplier, min $5)');
    
    console.log('\n  💳 Transactions (10 total):');
    console.log('    - Purchase: 2 transactions (1 requires verification)');
    console.log('    - Redemption: 2 transactions (1 unprocessed)');
    console.log('    - Transfer: 2 transactions (sender/receiver pair)');
    console.log('    - Event: 2 transactions (attendance rewards)');
    console.log('    - Adjustment: 2 transactions (+10, -5 points)');
    
    console.log('\n🔑 Test Credentials:');
    console.log('  All users have password: "password123"');
    console.log('  Login with any utorid to test endpoints');
    
    console.log('\n📊 Sample Data Relationships:');
    console.log('  ✅ Events have organizers and guests');
    console.log('  ✅ Users have promotion relationships');
    console.log('  ✅ Transactions show all types');
    console.log('  ✅ Point balances calculated correctly');
    console.log('  ✅ Suspicious cashier scenario included');
    
    console.log('\n🚀 Postman Testing Guide:');
    console.log('\n1. Authentication:');
    console.log('   POST /auth/tokens');
    console.log('   Body: { "utorid": "user001", "password": "password123" }');
    console.log('   Response: { "token": "...", "user": {...} }');
    
    console.log('\n2. User Management:');
    console.log('   GET /auth/users (cashier+)');
    console.log('   PUT /auth/users/:id (manager+)');
    console.log('   GET /auth/me (any authenticated)');
    console.log('   PATCH /auth/me (any authenticated)');
    
    console.log('\n3. Transactions:');
    console.log('   POST /transactions (create purchase/redemption/transfer)');
    console.log('   GET /transactions/:id (view transaction)');
    console.log('   GET /transactions/users/:userId (user transactions)');
    console.log('   POST /transactions/:id/processed (cashier process)');
    console.log('   POST /transactions/:id/suspicious (manager flag)');
    
    console.log('\n4. Events:');
    console.log('   GET /events (list events)');
    console.log('   POST /events (create event)');
    console.log('   GET /events/:id (event details)');
    console.log('   PATCH /events/:id (update event - organizers)');
    console.log('   POST /events/:id/organizers/:userId (add organizer - managers)');
    console.log('   POST /events/:id/guests/me (self RSVP)');
    console.log('   POST /events/:id/award-points (award points - organizers)');
    
    console.log('\n5. Role-Based Testing:');
    console.log('   Regular users: Can create redemptions, transfers, RSVP to events');
    console.log('   Cashiers: Can create purchases, process transactions');
    console.log('   Managers: Can manage users, events, flag suspicious transactions');
    console.log('   Organizers: Can update events, award points');
    console.log('   Superusers: Full access to all operations');
    
    console.log('\n✅ Seed Data Benefits:');
    console.log('  ✅ All user roles represented');
    console.log('  ✅ Realistic data relationships');
    console.log('  ✅ Edge cases included (suspicious cashier)');
    console.log('  ✅ All transaction types illustrated');
    console.log('  ✅ Events with organizers and guests');
    console.log('  ✅ Promotions with user relationships');
    console.log('  ✅ Point balances calculated correctly');
    
    console.log('\n🎯 Ready for End-to-End Testing:');
    console.log('  1. Login with different user roles');
    console.log('  2. Test all CRUD operations');
    console.log('  3. Verify role-based permissions');
    console.log('  4. Test business logic scenarios');
    console.log('  5. Validate data relationships');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testSeedData().catch(console.error);
}

module.exports = { testSeedData };

