# Authentication and Access Flow v2

## Core Principles

1. Users MUST complete each step in sequence:
   - Authentication
   - Access Verification
   - Onboarding
   - Platform Access

2. No skipping steps:
   - Cannot access platform without onboarding
   - Cannot onboard without access
   - Cannot get access without authentication

## Page Flow Rules

### 1. Home Page (`/`)
- **Initial Entry Point**
  - Checks session status
  - Redirects based on user state
- **State-Based Routing**
  ```
  if (!authenticated) → /auth
  else if (!has_access) → /access
  else if (!onboarded) → /onboarding
  else → /platform
  ```

### 2. Auth Page (`/auth`)
- **Entry Conditions**
  - No active session
  - Expired session
  - Manual logout
- **Exit Conditions**
  - Success: MUST redirect to `/access`
  - Failure: Stay on `/auth` with error
- **State Mutations**
  - Sets `authenticated = true`
  - Creates session
  - Stores user data

### 3. Access Page (`/access`)
- **Entry Conditions**
  - Must be authenticated
  - No existing access record
- **Exit Conditions**
  - Success: Redirect to `/onboarding`
  - Failure: Stay on `/access`
- **Access Methods**
  1. **Founder Code**
     - 500 slots limit
     - One-time use
     - Creates access record
  2. **Riddle**
     - Unlimited attempts
     - Creates access record on success
  3. **Payment**
     - $1,000 one-time payment
     - Creates access record on success
- **State Mutations**
  - Creates `access_record`
  - Sets `has_access = true`

### 4. Onboarding Page (`/onboarding`)
- **Entry Conditions**
  - Must be authenticated
  - Must have access record
  - Incomplete profile/workspace/channel
- **Required Steps**
  1. Profile Creation
     - Username
     - Basic info
  2. Workspace Setup
     - Create or join workspace
     - Set workspace preferences
  3. Channel Creation
     - Create initial channel
     - Set channel type
- **Exit Conditions**
  - ALL steps must be complete
  - Only then redirect to `/platform`
- **State Mutations**
  - Creates user profile
  - Creates/joins workspace
  - Creates initial channel
  - Sets `onboarded = true`

### 5. Platform Page (`/platform`)
- **Entry Conditions**
  - Must be authenticated
  - Must have access record
  - Must be fully onboarded
- **Guard Checks**
  ```typescript
  if (!authenticated) → /auth
  if (!has_access) → /access
  if (!onboarded) → /onboarding
  ```

## Database Schema Requirements

### 1. User Authentication
```sql
auth.users
  - id
  - email
  - created_at
```

### 2. Access Records
```sql
access_records
  - user_id
  - access_type (founder_code, riddle, payment)
  - granted_at
  - code_used (for founder codes)
```

### 3. Onboarding State
```sql
user_profiles
  - id
  - username
  - onboarding_completed
  - profile_step_completed
  - workspace_step_completed
  - channel_step_completed
```

## Session Management

1. **Session Tokens**
   - JWT with expiration
   - Stored in secure cookie
   - Includes access status

2. **State Tracking**
   ```typescript
   interface UserState {
     authenticated: boolean;
     has_access: boolean;
     onboarded: boolean;
     current_workspace: string | null;
   }
   ```

## Error Handling

1. **Session Errors**
   - Expired → `/auth`
   - Invalid → `/auth`
   - Missing → `/auth`

2. **Access Errors**
   - Invalid code → Stay on `/access`
   - Payment failed → Stay on `/access`
   - Riddle failed → Stay on `/access`

3. **Onboarding Errors**
   - Step failure → Stay on step
   - Network error → Retry mechanism
   - Invalid data → Validation errors

## Security Considerations

1. **Route Protection**
   - All routes except `/` and `/auth` require authentication
   - `/platform` requires all checks
   - `/onboarding` requires auth + access
   - `/access` requires auth only

2. **Access Verification**
   - Check on every protected route
   - Verify access record exists
   - Validate access type

3. **State Verification**
   - Check complete state on navigation
   - Prevent URL manipulation
   - Validate all required data

## Implementation Notes

1. **Client-Side**
   - Use middleware for route protection
   - Implement loading states
   - Handle offline scenarios

2. **Server-Side**
   - Validate all state changes
   - Double-check access rights
   - Log security events

3. **Database**
   - Use transactions for state changes
   - Implement proper indexing
   - Monitor access patterns 