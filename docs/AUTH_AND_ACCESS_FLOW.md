# Authentication and Access Flow

## Page Behaviors

### 1. Home Page (`/`)
- **Not Logged In**
  - Shows "Sign In" button
  - Opens AuthModal on click
- **Logged In + Has Access**
  - Shows "Go to Platform" button
  - Button redirects to `/platform`
- **Logged In + No Access**
  - Shows "Get Access" button
  - Opens AccessModal on click

### 2. Platform Page (`/platform`)
- **Not Logged In**
  - Automatically redirects to home page
- **Logged In + Has Access**
  - Stays on page
  - Shows platform content
- **Logged In + No Access**
  - Automatically redirects to home page

## Modal Components

### 1. AuthModal
- Appears when clicking "Sign In"
- Contains:
  - Email/password login form
  - OAuth options (Google, GitHub)
  - Error handling
  - Success redirects to current page with updated state

### 2. AccessModal
- Appears when clicking "Get Access"
- Contains three tabs:
  1. **Founder Code**
     - Input for founder code
     - Terms acceptance checkbox
     - 500 slots limit counter
  2. **Riddle**
     - Riddle question display
     - Answer input
     - Unlimited attempts
  3. **Payment**
     - $1,000 one-time payment
     - Stripe integration
     - Instant access on success

## Access Methods

There are three ways to gain access to the platform:

1. **Founder Code**
   - Limited to 500 slots
   - First come, first served
   - One code per user

2. **Riddle Solution**
   - Unlimited attempts
   - Must solve correctly
   - One successful solution per user

3. **Payment**
   - One-time payment of $1,000
   - Immediate access upon successful payment

## Technical Implementation

### State Management
- Uses React state for modal visibility
- Tracks authentication and access status
- Updates UI based on state changes

### Database Tables
- `access_records`: Tracks user access
- `founder_codes`: Manages founder code usage
- `founder_code_count`: Tracks total codes used
- `riddle_completions`: Records successful riddles 