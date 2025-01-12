# Development Checklists

## General Setup

1. **Clone the Repository**
   - Run `git clone [your-repo-url]`
   - Navigate into the project directory: `cd slack-clone`

2. **Install Dependencies**
   - Run `npm install` to install all necessary packages.

3. **Environment Variables**
   - Create a `.env.local` file in the root directory.
   - Add necessary environment variables:
     ```env
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
     ```

4. **Start Development Server**
   - Run `npm run dev` to start the server.
   - Access the application at `http://localhost:3000`.

## Troubleshooting Build Errors

1. **Verify File Structure**
   - Ensure all components are in their expected directories.
   - Check for missing files or incorrect paths.

2. **Correct Import Paths**
   - Update import statements to reflect the correct file paths.

3. **Install Missing Dependencies**
   - Run `npm install` to ensure all dependencies are installed.

4. **Check Next.js Version**
   - Update Next.js if outdated: `npm install next@latest`.

5. **Verify Environment Variables**
   - Ensure all necessary environment variables are set and valid.
   - Restart the server after changes.

6. **Check for Typos**
   - Review code for any typos in import statements or component names.

7. **Review Console and Terminal Logs**
   - Check for additional error messages in the console and terminal.

8. **Test the Application**
   - Verify that all features work as expected after resolving errors.

## Additional Notes

- **Documentation**
  - Update any relevant documentation or comments in the codebase to reflect changes made during troubleshooting.

- **Contributing**
  - Contributions are welcome! Please feel free to submit a Pull Request.

- **License**
  - This project is licensed under the MIT License - see the LICENSE file for details. 