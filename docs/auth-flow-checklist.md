# Auth Flow Testing & Verification Checklist

## Sign Up Flow
- [ ] New user signs up with email/password
  - [ ] Receives verification email
    - [ ] Verification link points to https://www.ohfpartners.com/access?redirectedfromauth=supabase
    - [ ] Verify link works and properly validates email
  - [ ] After verification, lands directly on /access page
    - [ ] If no access record -> stays on /access for payment
    - [ ] After payment/access granted -> proceed
  - [ ] Only then redirects to /onboarding if needed
  - [ ] Creates user profile during onboarding
  - [ ] Automatically adds to OHF Community workspace
  - [ ] Creates first workspace if none exists

- [ ] New user signs up with OAuth (GitHub/Google)
  - [ ] Successfully creates account
  - [ ] Checks access_records
    - [ ] If no access record -> redirect to /access for payment
    - [ ] After payment/access granted -> proceed
  - [ ] Only then redirects to /onboarding if no profile exists
  - [ ] Creates user profile during onboarding
  - [ ] Automatically adds to OHF Community workspace
  - [ ] Creates first workspace if none exists

## Sign In Flow
- [ ] Existing user signs in with email/password
  - [ ] First check access_records status
    - [ ] If no access record -> redirect to /access
    - [ ] Must complete payment/access process before proceeding
  - [ ] After confirming access, check workspace membership
    - [ ] If no workspaces -> redirect to /onboarding
    - [ ] If has workspaces -> redirect to /platform
  - [ ] Verify OHF Community workspace membership
    - [ ] If not a member -> automatically add

- [ ] Existing user signs in with OAuth
  - [ ] Same access_records check first
  - [ ] Same workspace checks after access confirmed
  - [ ] Proper session handling
  - [ ] Correct redirect based on status

## Access Verification
- [ ] Check access_records table immediately after auth success
  - [ ] Block all other flows until access is confirmed
  - [ ] Verify correct redirect to /access if no active record
  - [ ] Verify proper handling of different access types:
    - [ ] Payment-based access
    - [ ] Riddle-based access
    - [ ] Founder code access
  - [ ] Only after access is confirmed, proceed with other checks

## Workspace Verification
- [ ] Check workspace membership after login
  - [ ] Verify OHF Community workspace exists
  - [ ] Verify user is member of OHF Community
  - [ ] Auto-add to OHF Community if not member
  - [ ] Redirect to onboarding if no workspaces

## Error Handling
- [ ] Test invalid credentials
- [ ] Test expired sessions
- [ ] Test missing profile scenarios
- [ ] Test network errors during auth
- [ ] Test incomplete onboarding scenarios

## Session Management
- [ ] Verify session persistence
- [ ] Test session refresh
- [ ] Test intentional logout
- [ ] Test session expiry

## Code Locations to Check/Fix
1. `/app/auth/page.tsx`
   - Verify OAuth callback handling
   - Check profile creation logic
   - Ensure proper redirects

2. `/lib/auth-config.ts`
   - Verify session callback logic
   - Check access verification
   - Update redirect handling

3. `/app/auth/callback/`
   - Verify OAuth callback processing
   - Check session establishment
   - Ensure proper error handling

4. `/app/onboarding/`
   - Verify workspace creation
   - Check OHF Community workspace addition
   - Ensure profile completion

## Required Fixes
1. Implement access_records check after login
2. Add automatic OHF Community workspace membership
3. Fix onboarding redirect logic
4. Ensure proper error handling and user feedback
5. Add logging for debugging auth flow issues

## Testing Steps
1. Clear all cookies and local storage
2. Test each sign-up method (email, OAuth providers)
3. Test each sign-in method
4. Verify all redirects and automatic actions
5. Test error scenarios and recovery
6. Verify session management
7. Check all required database records are created 