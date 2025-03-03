# Slack Clone

A modern Slack clone built with Next.js 14, Supabase, and Tailwind CSS. Features real-time messaging, reactions, thread replies, and file attachments.

## Live Demo

🌐 **Vercel Deployment**: [Slack Clone Demo](https://slack-clone-demo.vercel.app)

## Repository Access

📂 **GitHub Repository**: [Slack Clone Review](https://github.com/rogerHuntGauntlet/Slack-Clone-Review)

To get access to the repository:

1. Clone the repository using:

```bash
git clone https://github.com/rogerHuntGauntlet/Slack-Clone-Review.git
cd Slack-Clone-Review
```

## Features

- 🔄 Real-time messaging and updates
- 💬 Thread replies and conversations
- 😄 Emoji reactions
- 📎 File attachments
- 👥 Workspace and channel management
- 🌓 Dark mode support
- 🎨 Modern UI with Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14.2, React, TypeScript
- **Styling**: Tailwind CSS
- **Backend & Auth**: Supabase
- **Database**: PostgreSQL (via Supabase)
- **Deployment**: Vercel (recommended)

## Getting Started

1. Clone the repository:

```bash
git clone https://github.com/rogerHuntGauntlet/Slack-Clone-Review.git
cd Slack-Clone-Review
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:
   Create a `.env.local` file with the following:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: Other configurations
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

4. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Deployment

This project is configured for deployment on Vercel. To deploy your own instance:

1. Create a new project on [Supabase](https://supabase.com)
2. Fork this repository to your GitHub account
3. Create a new project on [Vercel](https://vercel.com)
4. Connect your GitHub repository to Vercel
5. Configure the following environment variables in your Vercel project settings:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
NEXT_PUBLIC_SITE_URL=https://your-domain.vercel.app
```

6. Deploy! Vercel will automatically build and deploy your project

The project will automatically deploy when you push changes to the main branch.

## Database Schema

The project uses Supabase as the backend. The database schema is managed through Supabase's interface or migrations. Here's the basic structure:

```sql
-- Users table (managed by Supabase Auth)
-- Messages table
create table messages (
  id uuid default uuid_generate_v4() primary key,
  content text not null,
  user_id uuid references auth.users not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add more tables as needed
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.