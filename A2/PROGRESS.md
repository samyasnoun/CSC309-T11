

## Summary of Fixes Applied

### Completed:
1. Fixed name filter SQLite compatibility (removed mode: insensitive)
2. Fixed empty PATCH body validation  
3. Fixed middleware chain for event routes
4. Fixed promotion type mapping (onetime <-> one-time)
5. Fixed event capacity to return 410 Gone
6. Fixed password reset to set verified=true

### Remaining Issues (Score: 89/220):
- User permission checks (403 errors)
- Transaction permission checks (403 errors)  
- Event operations (many 400/403 errors)
- Promotion operations (403 errors)
- Transfer/redemption validation

### Next Steps:
Need to systematically fix each controller's permission logic and validation.


