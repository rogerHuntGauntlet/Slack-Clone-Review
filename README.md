# Slack Clone

A modern Slack clone built with Next.js 14, NextAuth.js, and Tailwind CSS. Features real-time messaging, reactions, thread replies, and file attachments.

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
- 🔒 Authentication with NextAuth.js

## Tech Stack

- **Frontend**: Next.js 14.2, React, TypeScript
- **Styling**: Tailwind CSS
- **Authentication**: NextAuth.js
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
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret # Generate a secure secret: `openssl rand -base64 32`
```

4. Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Deployment

This project is configured for deployment on Vercel. To deploy your own instance:

1. Fork the repository to your GitHub account
2. Create a new project on [Vercel](https://vercel.com)
3. Connect your GitHub repository to Vercel
4. Configure the following environment variables in your Vercel project settings:

```env
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret
```

5. Deploy! Vercel will automatically build and deploy your project

The project will automatically deploy when you push changes to the main branch.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.