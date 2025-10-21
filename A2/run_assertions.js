#!/usr/bin/env node
'use strict';

/**
 * Run Route-Level Assertions
 * 
 * Executes comprehensive tests to verify all requirements are met
 */

const { runAllTests } = require('./tests/route_assertions');

console.log('🔍 Running Route-Level Assertions for A2 Loyalty API');
console.log('=' .repeat(60));

try {
  runAllTests();
  console.log('\n🎯 All assertions passed! Requirements verified.');
} catch (error) {
  console.error('\n💥 Assertions failed:', error.message);
  process.exit(1);
}

