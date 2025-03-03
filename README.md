# Slack Clone

A modern Slack clone built with Next.js 13, Supabase, and Tailwind CSS. Features real-time messaging, reactions, thread replies, and file attachments.

## Live Demo

🌐 **Vercel Deployment**: [https://slack-clone-demo.vercel.app](https://slack-clone-demo.vercel.app)

## Repository Access

📂 **GitHub Repository**: [https://github.com/yourusername/slack-clone](https://github.com/yourusername/slack-clone)

To get access to the repository:
1. Request access from the repository owner
2. Once granted, you can clone the repository using:
```bash
git clone https://github.com/yourusername/slack-clone.git
cd slack-clone
```

## Deployment

This project is deployed on Vercel. To deploy your own instance:

1. Fork the repository to your GitHub account
2. Create a new project on [Vercel](https://vercel.com)
3. Connect your GitHub repository to Vercel
4. Configure the following environment variables in your Vercel project settings:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
5. Deploy! Vercel will automatically build and deploy your project

The project will automatically deploy when you push changes to the main branch.

## Features

- 🔄 Real-time messaging and updates
- 💬 Thread replies and conversations
- 😄 Emoji reactions
- 📎 File attachments
- 👥 Workspace and channel management
- 🌓 Dark mode support
- 🎨 Modern UI with Tailwind CSS
- 🔒 Authentication with Supabase

## Tech Stack

- **Frontend**: Next.js 13, React, TypeScript
- **Styling**: Tailwind CSS, Framer Motion
- **Backend**: Supabase (PostgreSQL, Real-time subscriptions)
- **Authentication**: Supabase Auth
- **File Storage**: Supabase Storage
- **Deployment**: Vercel (recommended)

## Getting Started

1. Clone the repository:
```bash
git clone [your-repo-url]
cd slack-clone
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env.local` file with the following:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Start the development server:
```bash
npm run dev
```

5. Initialize and start Supabase:
```bash
npx supabase init
npx supabase start
```

6. Run database migrations:
```bash
npx supabase db reset
```

## Database Setup

The project uses Supabase as the backend. The database schema and migrations are located in the `supabase/migrations` directory. Run migrations to set up your database:

```bash
npx supabase db reset
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 