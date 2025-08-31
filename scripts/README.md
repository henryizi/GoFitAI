# 🛠️ SnapBodyAI Scripts

This directory contains utility scripts for database management, deployment, and testing.

## 📁 Directory Structure

```
scripts/
├── README.md              # This file
├── database/              # Database migrations and setup scripts
│   ├── *.sql              # SQL migration files
│   └── *.js               # Database setup scripts
├── deployment/            # Deployment and configuration scripts
│   ├── *.sh               # Shell scripts for deployment
│   └── railway.json       # Railway deployment configuration
├── tests/                 # Test scripts and utilities
│   ├── test-*.js          # JavaScript test files
│   └── test-*.ts          # TypeScript test files
├── *.js                   # General utility scripts
└── *.ts                   # TypeScript utilities
```

## 🗄️ Database Scripts (`database/`)

SQL migration files and database setup scripts:

- `*.sql` - Database schema changes, data migrations
- `*.js` - Database setup and utility scripts
- `setup-supabase.sql` - Initial Supabase database setup
- `seed-exercises.js` - Populate exercises data

## 🚀 Deployment Scripts (`deployment/`)

Deployment and environment management:

- `*.sh` - Shell scripts for various deployment tasks
- `railway.json` - Railway.app deployment configuration
- `deploy-enhanced-food-recognition.sh` - Food analysis deployment
- `RAILWAY_QUICK_FIX.sh` - Quick deployment fixes

## 🧪 Test Scripts (`tests/`)

Testing utilities and temporary test files:

- `test-*.js` - JavaScript test scripts
- `test-*.ts` - TypeScript test scripts
- `test-tom-platz.js` - Bodybuilding plan tests
- `test-workout-plan.js` - Workout planning tests

## 📋 General Scripts

Utility scripts in the root of scripts directory:

- `generate-*` - Content generation scripts
- `run-migration.js` - Migration runner
- `pre-publish-check.js` - Pre-deployment checks

## 🔧 Usage Examples

### Running Database Migrations
```bash
cd scripts/database
# Run specific migration
node run-migration.js migration_name
```

### Deployment
```bash
cd scripts/deployment
# Deploy to Railway
./deploy-railway-with-cloudflare.sh
```

### Testing
```bash
cd scripts/tests
# Run specific test
node test-workout-plan.js
```

## 📝 Adding New Scripts

When adding new scripts:

1. **Choose the appropriate subdirectory:**
   - `database/` - Database-related scripts
   - `deployment/` - Deployment and infrastructure scripts
   - `tests/` - Test scripts and utilities

2. **Use descriptive filenames** with appropriate extensions
3. **Add documentation** to this README if needed
4. **Keep the root directory clean** - use subdirectories for organization

## 🧹 Maintenance

- Regularly clean up old test files from `tests/` directory
- Move completed migration files to archive if needed
- Update deployment scripts as infrastructure changes



















