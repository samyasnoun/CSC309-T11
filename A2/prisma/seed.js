#!/usr/bin/env node
'use strict';

/**
 * Prisma Database Seed Script
 * 
 * Creates sample data for testing all endpoints end-to-end:
 * - Users (regular/cashier/manager/superuser)
 * - Events with organizers and guests
 * - Promotions
 * - Transactions of all types
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  try {
    // Clear existing data (in reverse dependency order)
    console.log('🧹 Clearing existing data...');
    await prisma.userPromotion.deleteMany();
    await prisma.promotion.deleteMany();
    await prisma.eventGuest.deleteMany();
    await prisma.eventOrganizer.deleteMany();
    await prisma.event.deleteMany();
    await prisma.transaction.deleteMany();
    await prisma.user.deleteMany();
    console.log('✅ Existing data cleared\n');

    // Create users with different roles
    console.log('👥 Creating users...');
    
    const passwordHash = await bcrypt.hash('password123', 12);
    
    const users = await Promise.all([
      // Regular users
      prisma.user.create({
        data: {
          utorid: 'user001',
          name: 'Alice Johnson',
          email: 'alice.johnson@mail.utoronto.ca',
          role: 'regular',
          verified: true,
          activated: true,
          points: 150,
          passwordHash,
          createdAt: new Date('2024-01-15T10:00:00Z')
        }
      }),
      prisma.user.create({
        data: {
          utorid: 'user002',
          name: 'Bob Smith',
          email: 'bob.smith@mail.utoronto.ca',
          role: 'regular',
          verified: true,
          activated: true,
          points: 75,
          passwordHash,
          createdAt: new Date('2024-02-01T14:30:00Z')
        }
      }),
      
      // Cashiers
      prisma.user.create({
        data: {
          utorid: 'cash001',
          name: 'Carol Davis',
          email: 'carol.davis@mail.utoronto.ca',
          role: 'cashier',
          verified: true,
          activated: true,
          points: 200,
          passwordHash,
          createdAt: new Date('2024-01-10T09:00:00Z')
        }
      }),
      prisma.user.create({
        data: {
          utorid: 'cash002',
          name: 'David Wilson',
          email: 'david.wilson@mail.utoronto.ca',
          role: 'cashier',
          verified: true,
          activated: true,
          points: 300,
          suspicious: true, // Suspicious cashier for testing
          passwordHash,
          createdAt: new Date('2024-01-20T11:15:00Z')
        }
      }),
      
      // Managers
      prisma.user.create({
        data: {
          utorid: 'mgr001',
          name: 'Eva Brown',
          email: 'eva.brown@mail.utoronto.ca',
          role: 'manager',
          verified: true,
          activated: true,
          points: 500,
          passwordHash,
          createdAt: new Date('2024-01-05T08:00:00Z')
        }
      }),
      prisma.user.create({
        data: {
          utorid: 'mgr002',
          name: 'Frank Miller',
          email: 'frank.miller@mail.utoronto.ca',
          role: 'manager',
          verified: true,
          activated: true,
          points: 400,
          passwordHash,
          createdAt: new Date('2024-01-12T13:45:00Z')
        }
      }),
      
      // Organizers
      prisma.user.create({
        data: {
          utorid: 'org001',
          name: 'Grace Lee',
          email: 'grace.lee@mail.utoronto.ca',
          role: 'organizer',
          verified: true,
          activated: true,
          points: 600,
          passwordHash,
          createdAt: new Date('2024-01-08T12:00:00Z')
        }
      }),
      
      // Superuser
      prisma.user.create({
        data: {
          utorid: 'admin01',
          name: 'Admin User',
          email: 'admin@mail.utoronto.ca',
          role: 'superuser',
          verified: true,
          activated: true,
          points: 1000,
          passwordHash,
          createdAt: new Date('2024-01-01T00:00:00Z')
        }
      })
    ]);
    
    console.log(`✅ Created ${users.length} users`);

    // Create events
    console.log('\n🎉 Creating events...');
    
    const events = await Promise.all([
      prisma.event.create({
        data: {
          name: 'Tech Conference 2024',
          description: 'Annual technology conference featuring the latest innovations',
          location: 'Convention Center, Toronto',
          startAt: new Date('2024-12-25T09:00:00Z'),
          endAt: new Date('2024-12-25T17:00:00Z'),
          capacity: 100,
          pointsBudget: 1000,
          managerId: users.find(u => u.utorid === 'mgr001').id
        }
      }),
      prisma.event.create({
        data: {
          name: 'Workshop: Data Science',
          description: 'Hands-on data science workshop for beginners',
          location: 'Computer Science Building',
          startAt: new Date('2024-12-30T10:00:00Z'),
          endAt: new Date('2024-12-30T15:00:00Z'),
          capacity: 50,
          pointsBudget: 500,
          managerId: users.find(u => u.utorid === 'mgr002').id
        }
      }),
      prisma.event.create({
        data: {
          name: 'Networking Mixer',
          description: 'Professional networking event for students and alumni',
          location: 'Student Center',
          startAt: new Date('2025-01-15T18:00:00Z'),
          endAt: new Date('2025-01-15T21:00:00Z'),
          capacity: 75,
          pointsBudget: 750,
          managerId: users.find(u => u.utorid === 'mgr001').id
        }
      })
    ]);
    
    console.log(`✅ Created ${events.length} events`);

    // Add organizers to events
    console.log('\n👥 Adding organizers to events...');
    
    await Promise.all([
      // Tech Conference organizers
      prisma.eventOrganizer.create({
        data: {
          userId: users.find(u => u.utorid === 'org001').id,
          eventId: events[0].id
        }
      }),
      prisma.eventOrganizer.create({
        data: {
          userId: users.find(u => u.utorid === 'mgr001').id,
          eventId: events[0].id
        }
      }),
      
      // Data Science Workshop organizers
      prisma.eventOrganizer.create({
        data: {
          userId: users.find(u => u.utorid === 'org001').id,
          eventId: events[1].id
        }
      }),
      
      // Networking Mixer organizers
      prisma.eventOrganizer.create({
        data: {
          userId: users.find(u => u.utorid === 'mgr002').id,
          eventId: events[2].id
        }
      })
    ]);
    
    console.log('✅ Added organizers to events');

    // Add guests to events
    console.log('\n🎫 Adding guests to events...');
    
    await Promise.all([
      // Tech Conference guests
      prisma.eventGuest.create({
        data: {
          userId: users.find(u => u.utorid === 'user001').id,
          eventId: events[0].id,
          rsvp: true,
          attended: true,
          awardedPoints: 50
        }
      }),
      prisma.eventGuest.create({
        data: {
          userId: users.find(u => u.utorid === 'user002').id,
          eventId: events[0].id,
          rsvp: true,
          attended: false,
          awardedPoints: 0
        }
      }),
      
      // Data Science Workshop guests
      prisma.eventGuest.create({
        data: {
          userId: users.find(u => u.utorid === 'user001').id,
          eventId: events[1].id,
          rsvp: true,
          attended: true,
          awardedPoints: 25
        }
      }),
      
      // Networking Mixer guests
      prisma.eventGuest.create({
        data: {
          userId: users.find(u => u.utorid === 'user002').id,
          eventId: events[2].id,
          rsvp: true,
          attended: false,
          awardedPoints: 0
        }
      })
    ]);
    
    console.log('✅ Added guests to events');

    // Create promotions
    console.log('\n🎁 Creating promotions...');
    
    const promotions = await Promise.all([
      prisma.promotion.create({
        data: {
          name: 'Welcome Bonus',
          startAt: new Date('2024-01-01T00:00:00Z'),
          endAt: new Date('2024-12-31T23:59:59Z'),
          minSpendingCents: null,
          rateMultiplier: null,
          oneTimePoints: 50
        }
      }),
      prisma.promotion.create({
        data: {
          name: 'Double Points Weekend',
          startAt: new Date('2024-12-21T00:00:00Z'),
          endAt: new Date('2024-12-22T23:59:59Z'),
          minSpendingCents: 1000,
          rateMultiplier: 2.0,
          oneTimePoints: null
        }
      }),
      prisma.promotion.create({
        data: {
          name: 'Holiday Special',
          startAt: new Date('2024-12-20T00:00:00Z'),
          endAt: new Date('2025-01-05T23:59:59Z'),
          minSpendingCents: 500,
          rateMultiplier: 1.5,
          oneTimePoints: null
        }
      })
    ]);
    
    console.log(`✅ Created ${promotions.length} promotions`);

    // Create user-promotion relationships
    console.log('\n🔗 Linking users to promotions...');
    
    await Promise.all([
      // Welcome bonus for all users
      ...users.map(user => 
        prisma.userPromotion.create({
          data: {
            userId: user.id,
            promotionId: promotions[0].id,
            usedAt: new Date('2024-01-15T10:00:00Z')
          }
        })
      ),
      
      // Double points weekend for some users
      prisma.userPromotion.create({
        data: {
          userId: users.find(u => u.utorid === 'user001').id,
          promotionId: promotions[1].id,
          usedAt: new Date('2024-12-21T14:30:00Z')
        }
      }),
      
      // Holiday special for some users
      prisma.userPromotion.create({
        data: {
          userId: users.find(u => u.utorid === 'user002').id,
          promotionId: promotions[2].id,
          usedAt: null // Not used yet
        }
      })
    ]);
    
    console.log('✅ Linked users to promotions');

    // Create transactions of all types
    console.log('\n💳 Creating transactions...');
    
    const transactions = await Promise.all([
      // Purchase transactions
      prisma.transaction.create({
        data: {
          type: 'purchase',
          amountCents: 2500, // $25.00
          pointsDelta: 100, // floor(2500 / 25) = 100 points
          createdById: users.find(u => u.utorid === 'cash001').id,
          targetUserId: users.find(u => u.utorid === 'user001').id,
          cashierId: users.find(u => u.utorid === 'cash001').id,
          requiresVerification: false,
          processed: true,
          processedAt: new Date('2024-01-15T10:30:00Z'),
          createdAt: new Date('2024-01-15T10:30:00Z')
        }
      }),
      prisma.transaction.create({
        data: {
          type: 'purchase',
          amountCents: 1500, // $15.00
          pointsDelta: 60, // floor(1500 / 25) = 60 points
          createdById: users.find(u => u.utorid === 'cash002').id,
          targetUserId: users.find(u => u.utorid === 'user002').id,
          cashierId: users.find(u => u.utorid === 'cash002').id,
          requiresVerification: true, // Suspicious cashier
          processed: false,
          processedAt: null,
          createdAt: new Date('2024-01-20T11:30:00Z')
        }
      }),
      
      // Redemption transactions
      prisma.transaction.create({
        data: {
          type: 'redemption',
          amountCents: 100, // Redeeming 100 points
          pointsDelta: -100, // Negative for redemption
          createdById: users.find(u => u.utorid === 'user001').id,
          targetUserId: users.find(u => u.utorid === 'user001').id,
          requiresVerification: false,
          processed: true,
          processedAt: new Date('2024-01-16T14:00:00Z'),
          createdAt: new Date('2024-01-16T14:00:00Z')
        }
      }),
      prisma.transaction.create({
        data: {
          type: 'redemption',
          amountCents: 50, // Redeeming 50 points
          pointsDelta: -50, // Negative for redemption
          createdById: users.find(u => u.utorid === 'user002').id,
          targetUserId: users.find(u => u.utorid === 'user002').id,
          requiresVerification: false,
          processed: false, // Not processed yet
          processedAt: null,
          createdAt: new Date('2024-01-22T16:00:00Z')
        }
      }),
      
      // Transfer transactions (creates two records)
      prisma.transaction.create({
        data: {
          type: 'transfer',
          amountCents: 25, // Transferring 25 points
          pointsDelta: -25, // Negative for sender
          createdById: users.find(u => u.utorid === 'user001').id,
          targetUserId: users.find(u => u.utorid === 'user001').id, // Sender
          requiresVerification: false,
          processed: true,
          processedAt: new Date('2024-01-17T09:00:00Z'),
          createdAt: new Date('2024-01-17T09:00:00Z')
        }
      }),
      prisma.transaction.create({
        data: {
          type: 'transfer',
          amountCents: 25, // Transferring 25 points
          pointsDelta: 25, // Positive for receiver
          createdById: users.find(u => u.utorid === 'user001').id,
          targetUserId: users.find(u => u.utorid === 'user002').id, // Receiver
          requiresVerification: false,
          processed: true,
          processedAt: new Date('2024-01-17T09:00:00Z'),
          createdAt: new Date('2024-01-17T09:00:00Z')
        }
      }),
      
      // Event transactions
      prisma.transaction.create({
        data: {
          type: 'event',
          amountCents: 50, // 50 points awarded
          pointsDelta: 50, // Positive for event attendance
          createdById: users.find(u => u.utorid === 'org001').id,
          targetUserId: users.find(u => u.utorid === 'user001').id,
          requiresVerification: false,
          processed: true,
          processedAt: new Date('2024-01-18T12:00:00Z'),
          createdAt: new Date('2024-01-18T12:00:00Z')
        }
      }),
      prisma.transaction.create({
        data: {
          type: 'event',
          amountCents: 25, // 25 points awarded
          pointsDelta: 25, // Positive for event attendance
          createdById: users.find(u => u.utorid === 'org001').id,
          targetUserId: users.find(u => u.utorid === 'user001').id,
          requiresVerification: false,
          processed: true,
          processedAt: new Date('2024-01-19T15:30:00Z'),
          createdAt: new Date('2024-01-19T15:30:00Z')
        }
      }),
      
      // Adjustment transactions
      prisma.transaction.create({
        data: {
          type: 'adjustment',
          amountCents: 10, // +10 points adjustment
          pointsDelta: 10, // Positive adjustment
          createdById: users.find(u => u.utorid === 'mgr001').id,
          targetUserId: users.find(u => u.utorid === 'user001').id,
          requiresVerification: false,
          processed: true,
          processedAt: new Date('2024-01-20T10:00:00Z'),
          createdAt: new Date('2024-01-20T10:00:00Z')
        }
      }),
      prisma.transaction.create({
        data: {
          type: 'adjustment',
          amountCents: -5, // -5 points adjustment
          pointsDelta: -5, // Negative adjustment
          createdById: users.find(u => u.utorid === 'mgr002').id,
          targetUserId: users.find(u => u.utorid === 'user002').id,
          requiresVerification: false,
          processed: true,
          processedAt: new Date('2024-01-21T11:00:00Z'),
          createdAt: new Date('2024-01-21T11:00:00Z')
        }
      })
    ]);
    
    console.log(`✅ Created ${transactions.length} transactions`);

    // Update user points based on processed transactions
    console.log('\n💰 Updating user points...');
    
    for (const user of users) {
      const userTransactions = await prisma.transaction.findMany({
        where: {
          targetUserId: user.id,
          processed: true
        }
      });
      
      const totalPoints = userTransactions.reduce((sum, tx) => sum + tx.pointsDelta, 0);
      
      await prisma.user.update({
        where: { id: user.id },
        data: { points: totalPoints }
      });
    }
    
    console.log('✅ Updated user points based on transactions');

    // Summary
    console.log('\n📊 Seed Summary:');
    console.log(`  👥 Users: ${users.length} (regular: 2, cashier: 2, manager: 2, organizer: 1, superuser: 1)`);
    console.log(`  🎉 Events: ${events.length} (with organizers and guests)`);
    console.log(`  🎁 Promotions: ${promotions.length} (with user relationships)`);
    console.log(`  💳 Transactions: ${transactions.length} (purchase, redemption, transfer, event, adjustment)`);
    console.log(`  🔗 Relationships: Event organizers, guests, user promotions`);
    
    console.log('\n🎯 Test Data Ready:');
    console.log('  ✅ All user roles represented');
    console.log('  ✅ Events with organizers and guests');
    console.log('  ✅ Promotions with user relationships');
    console.log('  ✅ All transaction types illustrated');
    console.log('  ✅ Suspicious cashier scenario');
    console.log('  ✅ Processed and unprocessed transactions');
    console.log('  ✅ Point balances calculated correctly');
    
    console.log('\n🔑 Test Credentials:');
    console.log('  All users have password: "password123"');
    console.log('  Regular users: user001, user002');
    console.log('  Cashiers: cash001, cash002 (cash002 is suspicious)');
    console.log('  Managers: mgr001, mgr002');
    console.log('  Organizer: org001');
    console.log('  Superuser: admin01');
    
    console.log('\n✅ Database seed completed successfully!');
    console.log('\n🚀 Ready for Postman testing:');
    console.log('  1. Login with any user credentials');
    console.log('  2. Test all endpoints with different roles');
    console.log('  3. Verify permissions and data relationships');
    
  } catch (error) {
    console.error('❌ Seed failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run seed if this file is executed directly
if (require.main === module) {
  main()
    .catch((error) => {
      console.error('💥 Fatal error during seed:', error);
      process.exit(1);
    });
}

module.exports = { main };