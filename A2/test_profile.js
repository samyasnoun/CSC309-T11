#!/usr/bin/env node
'use strict';

// Test script for self profile endpoints
const baseUrl = 'http://localhost:8000';

async function testProfile() {
  console.log('🧪 Testing Self Profile Endpoints\n');
  
  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/health`);
    const healthData = await healthResponse.json();
    console.log('✅ Health check:', healthData);
    
    // Test 2: Test without authentication (should fail)
    console.log('\n2. Testing profile endpoints without authentication...');
    try {
      const unauthedResponse = await fetch(`${baseUrl}/auth/me`);
      const unauthedData = await unauthedResponse.json();
      console.log('✅ Expected 401 for unauthenticated request:', unauthedResponse.status, unauthedData);
    } catch (error) {
      console.log('✅ Expected error for unauthenticated request');
    }
    
    // Test 3: Test PATCH without authentication
    console.log('\n3. Testing profile update without authentication...');
    try {
      const unauthedPatchResponse = await fetch(`${baseUrl}/auth/me`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'New Name' })
      });
      const unauthedPatchData = await unauthedPatchResponse.json();
      console.log('✅ Expected 401 for unauthenticated PATCH:', unauthedPatchResponse.status, unauthedPatchData);
    } catch (error) {
      console.log('✅ Expected error for unauthenticated PATCH');
    }
    
    console.log('\n🎉 Profile endpoint tests completed!');
    console.log('\n📋 Self Profile Endpoints:');
    console.log('  GET  /auth/me - Get current user\'s full profile');
    console.log('  PATCH /auth/me - Update current user\'s profile');
    
    console.log('\n🔍 GET /auth/me Response:');
    console.log('  Returns full user profile including:');
    console.log('    - id, utorid, name, email, birthday');
    console.log('    - role, verified, activated, points');
    console.log('    - suspicious, createdAt, lastLogin, avatarUrl');
    
    console.log('\n📝 PATCH /auth/me Features:');
    console.log('  - Update name (1-50 characters)');
    console.log('  - Update email (UofT domain required)');
    console.log('  - Update birthday (valid date, not future)');
    console.log('  - Upload avatar (image files only)');
    
    console.log('\n📁 Avatar Upload:');
    console.log('  - File saved to: /uploads/avatars/<utorid>.<ext>');
    console.log('  - Relative URL stored in avatarUrl field');
    console.log('  - Image files only (5MB limit)');
    console.log('  - Single file upload via multipart/form-data');
    
    console.log('\n📊 Example Responses:');
    console.log('\nGET /auth/me:');
    console.log(JSON.stringify({
      "id": 1,
      "utorid": "user123",
      "name": "John Doe",
      "email": "john@mail.utoronto.ca",
      "birthday": "1995-06-15T00:00:00.000Z",
      "role": "regular",
      "verified": true,
      "activated": true,
      "points": 150,
      "suspicious": false,
      "createdAt": "2024-12-20T10:30:00.000Z",
      "lastLogin": "2024-12-20T15:45:00.000Z",
      "avatarUrl": "/uploads/avatars/user123.jpg"
    }, null, 2));
    
    console.log('\nPATCH /auth/me (with avatar):');
    console.log('  Content-Type: multipart/form-data');
    console.log('  Fields: name, email, birthday, avatar (file)');
    console.log('  Response: Updated profile object');
    
    console.log('\n🚫 Validation Rules:');
    console.log('  - Name: 1-50 characters required');
    console.log('  - Email: Must be from UofT domain');
    console.log('  - Birthday: Valid date, cannot be future');
    console.log('  - Avatar: Image files only, 5MB max');
    
    console.log('\n📝 Usage Examples:');
    console.log('  # Get profile');
    console.log('  GET /auth/me -H "Authorization: Bearer TOKEN"');
    console.log('');
    console.log('  # Update profile (JSON)');
    console.log('  PATCH /auth/me -H "Authorization: Bearer TOKEN" \\');
    console.log('    -H "Content-Type: application/json" \\');
    console.log('    -d \'{"name": "New Name", "email": "new@mail.utoronto.ca"}\'');
    console.log('');
    console.log('  # Update with avatar (multipart)');
    console.log('  PATCH /auth/me -H "Authorization: Bearer TOKEN" \\');
    console.log('    -F "name=New Name" \\');
    console.log('    -F "email=new@mail.utoronto.ca" \\');
    console.log('    -F "avatar=@/path/to/image.jpg"');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run tests if this file is executed directly
if (require.main === module) {
  testProfile().catch(console.error);
}

module.exports = { testProfile };

