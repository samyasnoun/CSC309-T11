# Database Seed System

This document describes the comprehensive seed system for the A2 Loyalty API.

## Overview

The seed system creates realistic test data for all endpoints, including:
- Users with different roles and permissions
- Events with organizers and guests
- Promotions with user relationships
- Transactions of all types
- Realistic data relationships and edge cases

## Usage

### Run Seed Script

```bash
# Method 1: Using Prisma CLI (recommended)
npx prisma db seed

# Method 2: Direct execution
node prisma/seed.js

# Method 3: Using npm script
npm run prisma:seed
```

### Verify Seed Data

```bash
# Check if database is properly seeded
node verify_seed.js
```

## Seed Data Created

### 👥 Users (8 total)

| Utorid | Name | Role | Points | Password |
|--------|------|------|--------|----------|
| user001 | Alice Johnson | regular | 150 | password123 |
| user002 | Bob Smith | regular | 75 | password123 |
| cash001 | Carol Davis | cashier | 200 | password123 |
| cash002 | David Wilson | cashier | 300 | password123 (suspicious) |
| mgr001 | Eva Brown | manager | 500 | password123 |
| mgr002 | Frank Miller | manager | 400 | password123 |
| org001 | Grace Lee | organizer | 600 | password123 |
| admin01 | Admin User | superuser | 1000 | password123 |

### 🎉 Events (3 total)

1. **Tech Conference 2024**
   - Location: Convention Center, Toronto
   - Capacity: 100, Points Budget: 1000
   - Organizers: org001, mgr001
   - Guests: user001 (attended), user002 (RSVP only)

2. **Workshop: Data Science**
   - Location: Computer Science Building
   - Capacity: 50, Points Budget: 500
   - Organizers: org001
   - Guests: user001 (attended)

3. **Networking Mixer**
   - Location: Student Center
   - Capacity: 75, Points Budget: 750
   - Organizers: mgr002
   - Guests: user002 (RSVP only)

### 🎁 Promotions (3 total)

1. **Welcome Bonus**
   - Type: One-time points (50 points)
   - Duration: All year 2024
   - Status: Used by all users

2. **Double Points Weekend**
   - Type: Rate multiplier (2x)
   - Duration: Dec 21-22, 2024
   - Min Spending: $10.00
   - Status: Used by user001

3. **Holiday Special**
   - Type: Rate multiplier (1.5x)
   - Duration: Dec 20, 2024 - Jan 5, 2025
   - Min Spending: $5.00
   - Status: Available to user002

### 💳 Transactions (10 total)

#### Purchase Transactions (2)
- **Transaction 1**: $25.00 purchase → 100 points (processed)
- **Transaction 2**: $15.00 purchase → 60 points (requires verification - suspicious cashier)

#### Redemption Transactions (2)
- **Transaction 3**: 100 points redemption (processed)
- **Transaction 4**: 50 points redemption (unprocessed)

#### Transfer Transactions (2)
- **Transaction 5**: user001 → user002 (25 points, processed)

#### Event Transactions (2)
- **Transaction 6**: Tech Conference attendance (50 points)
- **Transaction 7**: Data Science Workshop attendance (25 points)

#### Adjustment Transactions (2)
- **Transaction 8**: +10 points adjustment for user001
- **Transaction 9**: -5 points adjustment for user002

## Testing Scenarios

### 🔐 Authentication Testing

```bash
# Login with different roles
curl -X POST "http://localhost:8000/auth/tokens" \
  -H "Content-Type: application/json" \
  -d '{"utorid": "user001", "password": "password123"}'

curl -X POST "http://localhost:8000/auth/tokens" \
  -H "Content-Type: application/json" \
  -d '{"utorid": "cash001", "password": "password123"}'

curl -X POST "http://localhost:8000/auth/tokens" \
  -H "Content-Type: application/json" \
  -d '{"utorid": "mgr001", "password": "password123"}'
```

### 👥 User Management Testing

```bash
# Get user profile (any authenticated user)
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:8000/auth/me"

# List users (cashier+)
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:8000/auth/users"

# Update user (manager+)
curl -X PUT "http://localhost:8000/auth/users/1" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"verified": true}'
```

### 💳 Transaction Testing

```bash
# Create purchase (cashier+)
curl -X POST "http://localhost:8000/transactions" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "purchase", "amountCents": 2000, "targetUserId": 1}'

# Create redemption (any user)
curl -X POST "http://localhost:8000/transactions" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type": "redemption", "amountCents": 50, "targetUserId": 1}'

# Process transaction (cashier+)
curl -X POST "http://localhost:8000/transactions/4/processed" \
  -H "Authorization: Bearer TOKEN"

# Flag suspicious (manager+)
curl -X POST "http://localhost:8000/transactions/1/suspicious" \
  -H "Authorization: Bearer TOKEN"
```

### 🎉 Event Testing

```bash
# List events
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:8000/events"

# Get event details
curl -H "Authorization: Bearer TOKEN" \
  "http://localhost:8000/events/1"

# Self RSVP
curl -X POST "http://localhost:8000/events/1/guests/me" \
  -H "Authorization: Bearer TOKEN"

# Add organizer (manager+)
curl -X POST "http://localhost:8000/events/1/organizers/2" \
  -H "Authorization: Bearer TOKEN"

# Award points (organizer+)
curl -X POST "http://localhost:8000/events/1/award-points" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"pointsPerPerson": 25}'
```

## Role-Based Testing Matrix

| Operation | Regular | Cashier | Manager | Organizer | Superuser |
|-----------|---------|---------|---------|-----------|-----------|
| Login | ✅ | ✅ | ✅ | ✅ | ✅ |
| View own profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update own profile | ✅ | ✅ | ✅ | ✅ | ✅ |
| Change password | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create redemption | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create transfer | ✅ | ✅ | ✅ | ✅ | ✅ |
| Create purchase | ❌ | ✅ | ✅ | ✅ | ✅ |
| Process transaction | ❌ | ✅ | ✅ | ✅ | ✅ |
| View users | ❌ | ✅ | ✅ | ✅ | ✅ |
| Create users | ❌ | ✅ | ✅ | ✅ | ✅ |
| Update users | ❌ | ❌ | ✅ | ✅ | ✅ |
| Flag suspicious | ❌ | ❌ | ✅ | ✅ | ✅ |
| Create events | ✅ | ✅ | ✅ | ✅ | ✅ |
| Update events | ❌ | ❌ | ❌ | ✅ | ✅ |
| Manage organizers | ❌ | ❌ | ✅ | ❌ | ✅ |
| Award points | ❌ | ❌ | ❌ | ✅ | ✅ |

## Edge Cases Included

### 🚨 Suspicious Cashier Scenario
- **User**: cash002 (David Wilson)
- **Behavior**: Marked as suspicious
- **Impact**: Transactions require manager verification
- **Testing**: Create purchase with cash002, verify requiresVerification=true

### 💰 Point Balance Scenarios
- **user001**: 150 points (multiple transactions)
- **user002**: 75 points (fewer transactions)
- **Testing**: Verify point calculations are correct

### 🎫 Event Capacity Testing
- **Tech Conference**: 100 capacity, has guests
- **Data Science**: 50 capacity, has guests
- **Testing**: Try to add more guests than capacity allows

### 🔄 Transaction States
- **Processed**: Most transactions are processed
- **Unprocessed**: Some redemptions await cashier processing
- **Requires Verification**: Suspicious cashier transactions
- **Testing**: Verify different transaction states

## Data Relationships

### Event Relationships
- Events have managers (who created them)
- Events have organizers (who can update them)
- Events have guests (who RSVP and attend)
- Organizers cannot be guests for the same event

### Transaction Relationships
- Transactions have creators (who initiated them)
- Transactions have targets (who receives points)
- Transactions have cashiers (who processed them)
- Different transaction types have different rules

### Promotion Relationships
- Users can have multiple promotions
- Promotions can be one-time or ongoing
- User promotions track usage status

## Cleanup and Reset

### Reset Database
```bash
# Reset database and re-seed
npm run prisma:reset
npx prisma db seed
```

### Clear Specific Data
```bash
# Clear all data
npx prisma migrate reset --force
```

## Troubleshooting

### Common Issues

1. **Seed fails with "Database not found"**
   - Run: `npx prisma migrate dev --name init`
   - Then: `npx prisma db seed`

2. **Seed fails with "Permission denied"**
   - Check file permissions on prisma/seed.js
   - Ensure database file is writable

3. **Seed runs but no data appears**
   - Check database connection
   - Verify Prisma client is properly configured

### Verification Commands

```bash
# Check if seed ran successfully
node verify_seed.js

# Check database directly
npx prisma studio

# Check specific tables
npx prisma db execute --stdin
# Then run: SELECT COUNT(*) FROM User;
```

## Postman Collection

The seed data is designed to work with Postman collections that test:
- Authentication flows
- Role-based permissions
- CRUD operations
- Business logic scenarios
- Error handling
- Data relationships

All endpoints should work end-to-end with the seeded data.

