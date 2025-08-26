# API Configuration

The web application's server base URL is now configurable through environment variables.

## Environment Variables

### `VITE_API_BASE_URL`

Sets the base URL for the backend API server.

**Default:** `http://localhost:8080`

## Configuration Files

- `.env` - Local development environment variables
- `.env.example` - Example environment file with documentation

## Usage

### Development
```bash
# .env
VITE_API_BASE_URL=http://localhost:8080
```

### Production
```bash
# .env.production
VITE_API_BASE_URL=https://api.yourdomain.com
```

### Staging
```bash
# .env.staging
VITE_API_BASE_URL=https://staging-api.yourdomain.com
```

## How It Works

The environment variable is used in:

1. **GraphQL Client** (`src/lib/graphql-client.ts`)
   - Endpoint: `${VITE_API_BASE_URL}/query`

2. **Auth API** (`src/api/auth-api.ts`)
   - Base URL: `${VITE_API_BASE_URL}`

## Building for Different Environments

```bash
# Development (uses .env)
npm run dev

# Production (uses .env.production)
npm run build

# Custom environment
VITE_API_BASE_URL=https://custom-api.com npm run build
```

## Notes

- Environment variables must be prefixed with `VITE_` to be accessible in the frontend
- Changes to environment variables require a restart of the development server
- The trailing slash is automatically handled (removed if present)
