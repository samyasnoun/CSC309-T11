#!/usr/bin/env node
'use strict';

/**
 * Verify Seed Data Script
 * 
 * Checks if the database has been properly seeded with sample data
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function verifySeed() {
  console.log('🔍 Verifying seed data...\n');

  try {
    // Check users
    const userCount = await prisma.user.count();
    console.log(`👥 Users: ${userCount}`);
    
    if (userCount > 0) {
      const users = await prisma.user.findMany({
        select: { utorid: true, name: true, role: true, points: true }
      });
      users.forEach(user => {
        console.log(`  - ${user.utorid} (${user.role}): ${user.points} points`);
      });
    }

    // Check events
    const eventCount = await prisma.event.count();
    console.log(`\n🎉 Events: ${eventCount}`);
    
    if (eventCount > 0) {
      const events = await prisma.event.findMany({
        select: { name: true, capacity: true, pointsBudget: true }
      });
      events.forEach(event => {
        console.log(`  - ${event.name}: ${event.capacity} capacity, ${event.pointsBudget} points budget`);
      });
    }

    // Check promotions
    const promotionCount = await prisma.promotion.count();
    console.log(`\n🎁 Promotions: ${promotionCount}`);
    
    if (promotionCount > 0) {
      const promotions = await prisma.promotion.findMany({
        select: { name: true, oneTimePoints: true, rateMultiplier: true }
      });
      promotions.forEach(promo => {
        const details = promo.oneTimePoints ? `${promo.oneTimePoints} points` : `${promo.rateMultiplier}x multiplier`;
        console.log(`  - ${promo.name}: ${details}`);
      });
    }

    // Check transactions
    const transactionCount = await prisma.transaction.count();
    console.log(`\n💳 Transactions: ${transactionCount}`);
    
    if (transactionCount > 0) {
      const transactions = await prisma.transaction.groupBy({
        by: ['type'],
        _count: { type: true }
      });
      transactions.forEach(group => {
        console.log(`  - ${group.type}: ${group._count.type} transactions`);
      });
    }

    // Check event relationships
    const organizerCount = await prisma.eventOrganizer.count();
    const guestCount = await prisma.eventGuest.count();
    console.log(`\n🔗 Event Relationships:`);
    console.log(`  - Organizers: ${organizerCount}`);
    console.log(`  - Guests: ${guestCount}`);

    // Check user promotions
    const userPromotionCount = await prisma.userPromotion.count();
    console.log(`\n🎁 User Promotions: ${userPromotionCount}`);

    console.log('\n✅ Seed verification completed!');
    
    if (userCount > 0 && eventCount > 0 && transactionCount > 0) {
      console.log('🎯 Database is properly seeded and ready for testing!');
    } else {
      console.log('⚠️  Database may not be fully seeded. Run: npx prisma db seed');
    }

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification if this file is executed directly
if (require.main === module) {
  verifySeed().catch(console.error);
}

module.exports = { verifySeed };

