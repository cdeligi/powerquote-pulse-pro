
# PowerQuotePro - Qualitrol Transformer Quoting System

PowerQuotePro is a comprehensive enterprise quoting system designed specifically for Qualitrol Corporation's transformer monitoring solutions. The platform enables sales teams to create, manage, and approve quotes for QTMS (Qualitrol Transformer Monitoring System) configurations, DGA (Dissolved Gas Analysis) units, and other transformer monitoring equipment.

## 🚀 Project Overview

PowerQuotePro streamlines the quote-to-order process with:
- **Multi-level Product Configuration**: Build complex QTMS configurations with chassis, cards, and sensor options
- **Advanced Pricing Management**: Dynamic pricing with discount approvals and margin controls
- **Role-based Access Control**: Level 1, Level 2, Admin, and Finance user roles with specific permissions
- **Quote Approval Workflow**: Automated approval routing based on margins and discount thresholds
- **Real-time Analytics**: Dashboard with quote volume trends and performance metrics
- **Integration Ready**: Oracle Customer ID and Salesforce Opportunity tracking

## 🛠 Technology Stack

### Frontend
- **React 18** with TypeScript for type-safe development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for utility-first responsive styling
- **shadcn/ui** for consistent, accessible UI components
- **Recharts** for interactive data visualizations
- **React Router** for client-side routing
- **TanStack Query** for server state management

### Backend & Database
- **Supabase** for authentication, database, and real-time features
- **PostgreSQL** with Row Level Security (RLS) policies
- **Edge Functions** for serverless backend logic
- **Real-time subscriptions** for live quote updates

### Development Tools
- **TypeScript** for static type checking
- **ESLint** for code quality
- **Prettier** for code formatting
- **Cypress** for end-to-end testing

## 📋 Prerequisites

Before running this project, ensure you have:
- **Node.js** (v18 or higher) - [Install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)
- **npm** (comes with Node.js)
- **Supabase Account** - [Create account](https://supabase.com)
- **Git** for version control

## 🔧 Installation & Setup

### 1. Clone the Repository
```bash
git clone <YOUR_GIT_URL>
cd <YOUR_PROJECT_NAME>
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Environment Configuration
```bash
# Copy the environment template
cp .env.example .env

# Edit .env and add your Supabase credentials
VITE_SUPABASE_URL=https://cwhmxpitwblqxgrvaigg.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3aG14cGl0d2JscXhncnZhaWdnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA3MTc3MTIsImV4cCI6MjA2NjI5MzcxMn0.NaAtGg1Fpx1obdHK5rBGM5IzSWJea7lniuimr5ZyFGU
```

**Finding Your Supabase Credentials:**
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the Project URL and anon/public key

### 4. Database Setup
```bash
# Run database migrations
npx supabase db push

# Optional: Seed with sample data
npx supabase db seed
```

### 5. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## 🏗 Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── admin/           # Admin panel components
│   ├── auth/            # Authentication components
│   ├── bom/             # Bill of Materials builder
│   ├── dashboard/       # Dashboard and analytics
│   ├── quotes/          # Quote management
│   └── ui/              # shadcn/ui components
├── hooks/               # Custom React hooks
├── integrations/        # Third-party integrations
│   └── supabase/        # Supabase client and types
├── pages/               # Route components
├── types/               # TypeScript type definitions
├── utils/               # Utility functions
└── data/                # Static data and configurations

supabase/
├── migrations/          # Database schema migrations
└── config.toml         # Supabase configuration
```

## 🎯 Key Features

### Product Configuration System
- **Level 1**: Base products (QTMS Chassis, DGA Units)
- **Level 2**: Product variants and options
- **Level 3**: Cards and customizations
- **Level 4**: Detailed sensor configurations

### User Roles & Permissions
- **Level 1**: Basic quote creation and viewing
- **Level 2**: Price adjustments and quote approvals
- **Admin**: Full system access and user management
- **Finance**: Financial oversight and margin control

### Quote Management
- Dynamic BOM building with real-time pricing
- Multi-currency support (USD, EUR, GBP, CAD)
- Discount request and approval workflow
- Quote status tracking and history

### Analytics Dashboard
- Quote volume trends and performance metrics
- Margin analysis and profitability insights
- User activity monitoring
- Approval rate tracking

## 🔐 Authentication Setup

### Supabase Auth Configuration
1. In Supabase Dashboard, go to Authentication → Settings
2. Configure Site URL: `http://localhost:8080` (development) or your production URL
3. Add Redirect URLs:
   - `http://localhost:8080`
   - Your production domain
4. Disable "Confirm email" for faster development testing

### User Registration
New users must be approved by administrators. The registration flow:
1. User submits registration request
2. Admin reviews and approves/rejects
3. Approved users receive login credentials
4. Role assignment determines system access

## 📊 Database Schema

### Core Tables
- `profiles` - User information and roles
- `quotes` - Quote headers and metadata
- `bom_items` - Bill of materials line items
- `products` - Product catalog (Levels 1-3)
- `level4_products` - Detailed configurations
- `quote_analytics` - Performance metrics

### Key Relationships
- Hierarchical product relationships (Level 1 → 2 → 3 → 4)
- Quote-to-BOM item associations
- User role permissions and quote access

## 🚀 Deployment

### Using Lovable (Recommended)
1. Visit your [Lovable Project](https://lovable.dev/projects/8d08ecff-3bea-40af-9fd0-71cf8c824485)
2. Click Share → Publish
3. Configure custom domain if needed

### Manual Deployment
```bash
# Build for production
npm run build

# Deploy dist/ folder to your hosting provider
```

### Environment Variables for Production
```bash
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-production-anon-key
```

## 🧪 Testing

### Run End-to-End Tests
```bash
# Run tests in headless mode
npx cypress run

# Open interactive test runner
npx cypress open
```

### Test Coverage
- Quote creation and approval workflow
- User authentication and authorization
- Product configuration and pricing
- Dashboard analytics and reporting

## 🔧 Development Guidelines

### Code Style
- Use TypeScript for all new code
- Follow established component patterns
- Implement proper error boundaries
- Use React Query for server state
- Implement RLS policies for data security

### Component Architecture
```typescript
// Example component structure
interface ComponentProps {
  // Type all props
}

const Component = ({ prop }: ComponentProps) => {
  // Component logic
  return <div>JSX</div>;
};

export default Component;
```

### Database Operations
```typescript
// Use proper error handling
const { data, error } = await supabase
  .from('table')
  .select('*')
  .eq('id', id);

if (error) {
  console.error('Database error:', error);
  // Handle error appropriately
}
```

## 🐛 Troubleshooting

### Common Issues

**Application Not Loading**
- Check browser console for JavaScript errors
- Verify Supabase environment variables
- Ensure database migrations are applied
- Check network connectivity to Supabase

**Authentication Problems**
- Verify Site URL and Redirect URLs in Supabase
- Check user roles and permissions
- Ensure RLS policies are correctly configured

**Database Connection Issues**
- Verify Supabase project is active
- Check API keys are correct and not expired
- Ensure proper network access to Supabase

**Build Errors**
- Clear node_modules and reinstall dependencies
- Check for TypeScript errors
- Verify all imports are correct

### Performance Optimization
- Enable Supabase connection pooling
- Implement proper caching strategies
- Use React.memo for expensive components
- Optimize database queries

## 📞 Support & Documentation

### Useful Links
- [Supabase Documentation](https://supabase.com/docs)
- [React Documentation](https://react.dev)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

### Project Management
- **Project URL**: https://lovable.dev/projects/8d08ecff-3bea-40af-9fd0-71cf8c824485
- **Version Control**: Git-based with automatic Lovable synchronization
- **Issue Tracking**: Use GitHub Issues or Lovable project management

## 📄 License

This project is proprietary software owned by Qualitrol Corporation. All rights reserved.

**© 2025 Qualitrol Corp. All rights reserved.**
**Confidential and proprietary. Unauthorized copying or distribution is prohibited.**

---

## 🔄 Recent Updates

### Latest Changes
- Enhanced error handling and loading states
- Improved analytics dashboard performance
- Updated authentication flow reliability
- Comprehensive documentation overhaul
- Database optimization and query improvements

For detailed change history, see the git commit log or Lovable project history.
