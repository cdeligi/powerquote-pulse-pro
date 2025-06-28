# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/8d08ecff-3bea-40af-9fd0-71cf8c824485

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/8d08ecff-3bea-40af-9fd0-71cf8c824485) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Copy `.env.example` and add your Supabase credentials.
cp .env.example .env
# Edit the new `.env` file and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

# Step 5: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/8d08ecff-3bea-40af-9fd0-71cf8c824485) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/tips-tricks/custom-domain#step-by-step-guide)

## Environment Variables

Copy `.env.example` to `.env` in the project root and add your Supabase credentials. The `.env` file is ignored by Git, so you'll need to create it yourself whenever you clone the repo. These values are used by the application and the Supabase CLI:

```dotenv
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

If you plan to run migrations you will also need to authenticate the Supabase CLI with `SUPABASE_ACCESS_TOKEN`.

## Installing Dependencies

Install all project dependencies with npm:

```sh
npm i
```

## Running the Development Server

Launch the Vite dev server with:

```sh
npm run dev
```

By default, Vite listens on <http://localhost:5173>. This project overrides the
port to `8080` in [`vite.config.ts`](vite.config.ts) under `server.port`. Adjust
that value if you'd like to run the server on a different port.

## Running Supabase Migrations

With the Supabase CLI installed and authenticated, apply the migrations in the `supabase` directory with:

```sh
npx supabase db push
```

## Cypress Tests

End-to-end tests are located in the `cypress/` folder. Execute them in headless mode with:

```sh
npx cypress run
```

You can also open the interactive runner using `npx cypress open`.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
