#!/usr/bin/env node
'use strict';

/**
 * Simple validation test
 */

console.log('🧪 Testing validation functions...');

try {
  const { validateUtorid, validatePagination } = require('./lib/validation');
  
  // Test utorid validation
  console.log('\n1. Testing utorid validation:');
  
  // Valid cases
  try {
    const result1 = validateUtorid('user123', { required: true });
    console.log('  ✅ 7 chars alphanumeric: PASS');
  } catch (error) {
    console.log('  ❌ 7 chars alphanumeric: FAIL -', error.message);
  }
  
  try {
    const result2 = validateUtorid('user1234', { required: true });
    console.log('  ✅ 8 chars alphanumeric: PASS');
  } catch (error) {
    console.log('  ❌ 8 chars alphanumeric: FAIL -', error.message);
  }
  
  // Invalid cases
  try {
    validateUtorid('user12', { required: true }); // 6 chars
    console.log('  ❌ 6 chars: FAIL (should have thrown error)');
  } catch (error) {
    console.log('  ✅ 6 chars: PASS (correctly threw error)');
  }
  
  try {
    validateUtorid('user-123', { required: true }); // contains hyphen
    console.log('  ❌ Contains hyphen: FAIL (should have thrown error)');
  } catch (error) {
    console.log('  ✅ Contains hyphen: PASS (correctly threw error)');
  }
  
  // Test pagination validation
  console.log('\n2. Testing pagination validation:');
  
  // Defaults
  try {
    const result1 = validatePagination({}, { defaultPage: 1, defaultLimit: 10 });
    console.log('  ✅ Empty object defaults: PASS -', JSON.stringify(result1));
  } catch (error) {
    console.log('  ❌ Empty object defaults: FAIL -', error.message);
  }
  
  // Custom values
  try {
    const result2 = validatePagination({ page: 2, limit: 20 }, { defaultPage: 1, defaultLimit: 10 });
    console.log('  ✅ Custom values: PASS -', JSON.stringify(result2));
  } catch (error) {
    console.log('  ❌ Custom values: FAIL -', error.message);
  }
  
  // Invalid values
  try {
    validatePagination({ page: 0 }, { defaultPage: 1, defaultLimit: 10 });
    console.log('  ❌ Page 0: FAIL (should have thrown error)');
  } catch (error) {
    console.log('  ✅ Page 0: PASS (correctly threw error)');
  }
  
  console.log('\n🎉 Validation tests completed!');
  
} catch (error) {
  console.error('💥 Test failed:', error.message);
  console.error(error.stack);
}

