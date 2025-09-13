# Database Configuration

This document describes how to configure database connections for the Imagor Studio server.

## Overview

The server supports multiple database backends through the `DATABASE_URL` environment variable:

- **SQLite** (default) - File-based database, no external dependencies
- **PostgreSQL** - Full-featured relational database
- **MySQL** - Popular relational database

## Configuration

### Environment Variable

Set the `DATABASE_URL` environment variable in your `.env` file or system environment:

```bash
DATABASE_URL=<database_connection_string>
```

### SQLite (Default)

SQLite is the default database and requires no external setup.

```bash
# File-based SQLite database
DATABASE_URL=sqlite:./imagor-studio.db

# In-memory SQLite database (for testing)
DATABASE_URL=sqlite::memory:
```

**Advantages:**
- No external dependencies
- Zero configuration
- Perfect for development and small deployments
- Automatic database file creation

### PostgreSQL

For production deployments with high concurrency requirements.

```bash
DATABASE_URL=postgres://username:password@hostname:port/database_name?sslmode=disable
```

**Examples:**
```bash
# Local PostgreSQL
DATABASE_URL=postgres://imagor:password@localhost:5432/imagor_studio?sslmode=disable

# Remote PostgreSQL with SSL
DATABASE_URL=postgres://user:pass@db.example.com:5432/imagor_studio?sslmode=require

# PostgreSQL with default port (5432)
DATABASE_URL=postgres://user:pass@localhost/imagor_studio
```

**Setup Requirements:**
1. Install PostgreSQL server
2. Create database: `CREATE DATABASE imagor_studio;`
3. Create user with appropriate permissions
4. Update `DATABASE_URL` with connection details

### MySQL

For deployments requiring MySQL compatibility.

```bash
DATABASE_URL=mysql://username:password@hostname:port/database_name
```

**Examples:**
```bash
# Local MySQL
DATABASE_URL=mysql://imagor:password@localhost:3306/imagor_studio

# Remote MySQL
DATABASE_URL=mysql://user:pass@db.example.com:3306/imagor_studio

# MySQL with default port (3306)
DATABASE_URL=mysql://user:pass@localhost/imagor_studio
```

**Setup Requirements:**
1. Install MySQL server
2. Create database: `CREATE DATABASE imagor_studio;`
3. Create user with appropriate permissions
4. Update `DATABASE_URL` with connection details

## Migration

The server automatically runs database migrations on startup. All database types use the same migration files, ensuring schema compatibility across different backends.

## Connection Parameters

### PostgreSQL Parameters

You can add query parameters to the PostgreSQL URL:

- `sslmode`: SSL connection mode (`disable`, `require`, `verify-ca`, `verify-full`)
- `connect_timeout`: Connection timeout in seconds
- `application_name`: Application name for connection tracking

Example:
```bash
DATABASE_URL=postgres://user:pass@localhost/db?sslmode=require&connect_timeout=10&application_name=imagor-studio
```

### MySQL Parameters

MySQL connections automatically include `parseTime=true` for proper time handling.

## Environment Examples

### Development
```bash
# .env.development
DATABASE_URL=sqlite:./dev.db
```

### Testing
```bash
# .env.test
DATABASE_URL=sqlite::memory:
```

### Production
```bash
# .env.production
DATABASE_URL=postgres://imagor_user:secure_password@db.production.com:5432/imagor_studio?sslmode=require
```

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Verify database server is running
   - Check hostname and port
   - Verify firewall settings

2. **Authentication Failed**
   - Verify username and password
   - Check user permissions
   - Ensure user can connect from the application host

3. **Database Not Found**
   - Create the database before starting the application
   - Verify database name in URL

4. **SSL/TLS Issues (PostgreSQL)**
   - Use `sslmode=disable` for local development
   - Use `sslmode=require` for production
   - Verify SSL certificates for `verify-ca` or `verify-full`

### Logging

The server logs database connection information on startup:

```
INFO Configuration loaded {"databaseURL": "postgres://user:***@localhost:5432/imagor_studio"}
```

Sensitive information (passwords) are masked in logs.

## Performance Considerations

### SQLite
- Single writer limitation
- Good for read-heavy workloads
- File locking on concurrent writes

### PostgreSQL
- Excellent concurrent performance
- Advanced features (JSON, full-text search)
- Better for high-traffic production use

### MySQL
- Good concurrent performance
- Wide ecosystem support
- Familiar to many developers

## Security

1. **Use strong passwords** for database users
2. **Enable SSL/TLS** for remote connections
3. **Limit database user permissions** to only required operations
4. **Use connection pooling** for production deployments
5. **Regular backups** of production databases

## Backup and Recovery

### SQLite
```bash
# Backup
cp imagor-studio.db imagor-studio.db.backup

# Restore
cp imagor-studio.db.backup imagor-studio.db
```

### PostgreSQL
```bash
# Backup
pg_dump imagor_studio > backup.sql

# Restore
psql imagor_studio < backup.sql
```

### MySQL
```bash
# Backup
mysqldump imagor_studio > backup.sql

# Restore
mysql imagor_studio < backup.sql
