# CSC309 A2 - Fixes Applied

## Major Fixes Applied

### 1. Public Endpoint Authentication
- **Created `optionalAuth` middleware** (`src/middleware/optionalAuth.js`)
- Applied to GET /events, GET /events/:id, GET /promotions, GET /promotions/:id
- Allows public access while enabling privileged views when token is present

### 2. Event Controller Fixes
- **Fixed postGuestToEvent response** (Cases 50, 64, 65): Now returns `{ id, utorid, name }` in `guestAdded` field
- **Fixed RSVP timing checks** (Cases 60-63): Check event end time before published status
- **Fixed event deletion** (Case 57): Returns 204 on success instead of 200
- **Fixed event listing for regular users** (Case 49): Regular users now see only published events + events where they're organizers (not guests)
- **Fixed points validation**: Allow points >= 0 (was > 0)

### 3. Promotion Controller Fixes
- **Fixed promotion deletion**: Returns 204 on success instead of 200
- **Fixed promotion ordering**: Use id ASC for stable ordering

### 4. Transaction Controller Fixes
- **Fixed adjustment response** (Case 81): Always include `relatedId` for adjustment/transfer transactions
- **Fixed adjustment validation** (Case 82): Return 404 when related transaction not found (was 400)

### 5. User Controller Fixes
- **Enhanced buildTransactionResponse**: Conditionally include fields based on transaction type

## Setup & Testing

### Reset & Run Loop

```bash
# From A2/ directory
npm install
npx prisma generate
npx prisma migrate reset -f
node prisma/createsu.js asnounsa demo.admin@mail.utoronto.ca Passw0rd!
node index.js 8000
```

### Environment Setup

Ensure `.env` file exists with:
```
JWT_SECRET=secretkey
DATABASE_URL="file:./dev.db"
```

## Test Results Expected to Improve

### Fixed Test Cases
- ✅ Case 34: Update my info (birthday) - Status pending verification
- ✅ Case 42, 44: Update event points
- ✅ Case 45, 49: Get all events (count fixes)
- ✅ Case 50, 64, 65: Add guest response schema
- ✅ Case 57: Delete published event
- ✅ Case 60-63: RSVP/Un-RSVP status codes
- ✅ Case 81-82: Adjustment transaction
- ✅ Case 106: Get promotions count

### Status Code Mappings
- **400 Bad Request**: Invalid body, malformed fields, business rule violations
- **401 Unauthorized**: Missing/invalid token
- **403 Forbidden**: Authenticated but insufficient role
- **404 Not Found**: Resource not found (user, event, promotion by ID)
- **410 Gone**: Event ended (time-based restriction)
- **201 Created**: Resource creation success
- **200 OK**: Read/update success
- **204 No Content**: Delete success (no body)

## Architecture Changes

### Middleware Chain Updates

**Events:**
- GET /events, GET /events/:id → `optionalAuth` (public with optional upgrade)
- POST /events → `authenticate`, `attachUser`, `requires("manager")`
- PATCH/DELETE /events/:id → `authenticate`, `attachUser`, `canManageEvent()`

**Promotions:**
- GET /promotions, GET /promotions/:id → `optionalAuth` (public with optional upgrade)
- POST/PATCH/DELETE /promotions/:id → `authenticate`, `requires("manager")`

## Key Implementation Details

### Role Hierarchy
```
regular (1) < cashier (2) < manager (3) < superuser (4)
```

### Event Visibility Rules
- **Regular users**: Published events only + events where they're organizers
- **Manager/Superuser**: All events, can filter by `?published=true/false`

### Promotion Visibility Rules
- **Regular/Cashier**: Active promotions only (startTime <= now <= endTime)
- **Manager/Superuser**: All promotions, can filter by `?started=true/false`, `?ended=true/false`

### Transaction Types
- **purchase**: Cashier creates for users, includes promotionIds
- **adjustment**: Manager adjusts transaction points, requires relatedId
- **transfer**: User transfers points to another user
- **redemption**: User redeems points
- **event**: System awards points after events

## Files Modified

- `src/middleware/optionalAuth.js` ✨ NEW
- `src/middleware/authMiddleware.js` (unchanged)
- `src/routes/events.js` ✏️ Updated
- `src/routes/promotions.js` ✏️ Updated
- `src/controllers/eventController.js` ✏️ Updated
- `src/controllers/promotionController.js` ✏️ Updated
- `src/controllers/transactionController.js` ✏️ Updated
- `src/controllers/userController.js` ✏️ Updated
- `src/services/jwt.js` ✏️ Added verifyToken

## Next Steps

1. Run the reset loop above
2. Test locally with Postman (collection coming)
3. Push to MarkUs
4. Verify improved test scores

