# DSWD Augmented Employee Monitoring System

A web-based monitoring system for DSWD earthquake augmentation employees. Track deployment status (Deployed, On Standby), regions, specializations, and employee details through a public dashboard and admin portal.

Built for deployment on [Vercel free tier](https://vercel.com) with [Supabase](https://supabase.com) as the database.

## Features

- **Public Monitoring Dashboard** — Real-time stats, charts, and searchable employee list
- **Employee Profiles** — Detailed view with status, region, specialization, and contact info
- **Admin Portal** — Secure login for managing employees and dynamic libraries
- **Dynamic Libraries** — Admin-managed dropdowns for specializations, regions, and statuses
- **Government-Style UI** — Professional DSWD branding, responsive on mobile and desktop

## Tech Stack

- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- Supabase (PostgreSQL + Auth)
- Recharts
- Vercel (deployment)

## Setup

### 1. Clone and install

```bash
npm install
```

### 2. Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a free project
2. Open **SQL Editor** and run the migration file:
   `supabase/migrations/001_initial_schema.sql`
3. Go to **Project Settings → API** and copy your URL and keys

### 3. Configure environment variables

Copy the example file and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Create an admin user

1. In Supabase Dashboard, go to **Authentication → Users**
2. Click **Add user** and create an admin account (email + password)
3. The `profiles` table is auto-populated with `role = 'admin'` on signup

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) for the public dashboard.
Admin login: [http://localhost:3000/admin/login](http://localhost:3000/admin/login)

## Deploy to Vercel

1. Push this project to a GitHub repository
2. Go to [Vercel Dashboard](https://vercel.com/jrgallibot-5289s-projects/~/deployments)
3. Click **Add New Project** and import your GitHub repo
4. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
5. Click **Deploy**

Vercel will auto-deploy on every push to your main branch.

## Project Structure

```
app/
  page.tsx                    # Public monitoring dashboard
  employees/[id]/page.tsx     # Employee detail
  admin/
    login/page.tsx            # Admin login
    (panel)/
      dashboard/page.tsx      # Admin overview
      employees/              # Employee CRUD
      libraries/page.tsx      # Dynamic library manager
components/
  dashboard/                  # Stats, charts, employee table
  admin/                      # Forms, sidebar, library manager
  layout/                     # Header, footer
lib/
  actions/                    # Server actions
  supabase/                   # Supabase clients
supabase/migrations/          # Database schema + seed data
```

## Database Tables

| Table | Purpose |
|-------|---------|
| `employees` | Augmented employee records |
| `library_specializations` | Dynamic specialization dropdown |
| `library_regions` | Philippine regions dropdown |
| `library_statuses` | Deployment status dropdown |
| `profiles` | Admin user profiles (linked to Supabase Auth) |

## License

For official use by the Department of Social Welfare and Development (DSWD).
