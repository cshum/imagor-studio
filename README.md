# Imagor Studio

A modern image gallery application with real-time thumbnail generation using Imagor for image processing.

## Features

- 🖼️ **Real Image Gallery**: Browse images from file system or S3 storage
- 🔄 **Dynamic Thumbnails**: Real-time thumbnail generation using Imagor
- 📱 **Responsive Design**: Modern React frontend with Tailwind CSS
- 🔐 **Authentication**: JWT-based authentication with admin setup
- 🗄️ **Flexible Storage**: Support for both file system and S3 storage
- 📊 **EXIF Data**: Real metadata extraction from images
- 🐳 **Docker Ready**: Streamlined development environment

## Project Structure

```
imagor-studio/
├── .env                       # Development environment configuration
├── .env.s3.example           # S3 configuration template
├── docker-compose.yml        # Development Docker setup
├── Dockerfile                # Multi-stage Docker build
├── scripts/
│   └── dev.sh               # Development startup script
├── server/                   # Go backend
│   ├── cmd/server/          # Main application
│   ├── internal/            # Internal packages
│   │   ├── imageservice/    # Imagor integration
│   │   ├── storage/         # Storage abstraction
│   │   ├── auth/            # Authentication
│   │   └── ...
│   └── storage/             # File storage directory (gitignored)
├── web/                     # React frontend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── pages/          # Page components
│   │   ├── lib/            # Utilities
│   │   └── stores/         # State management
│   ├── .env.example        # Frontend environment template
│   └── .env.production     # Production frontend config
├── graphql/                # GraphQL schema
├── test-data/             # Sample images for development
└── TESTING_GUIDE.md      # Testing documentation
```

## Quick Start

### Option 1: Automated Setup (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd imagor-studio
   ```

2. **Run the development script**
   ```bash
   chmod +x scripts/dev.sh
   ./scripts/dev.sh
   ```

   This will:
   - Start Imagor service in Docker
   - Set up environment configuration
   - Provide instructions for starting server and frontend

3. **Start the backend server** (in a new terminal)
   ```bash
   cd server
   make run
   ```

4. **Start the frontend** (in another terminal)
   ```bash
   cd web
   npm install
   npm run dev
   ```

### Option 2: Manual Setup

1. **Start Imagor service**
   ```bash
   docker compose up -d
   ```

2. **Start the backend server**
   ```bash
   cd server
   make run
   ```

3. **Start the frontend**
   ```bash
   cd web
   npm install
   npm run dev
   ```

### Access the Application

- **Frontend**: http://localhost:5173+ (Vite will find available port)
- **Backend API**: http://localhost:8080
- **Imagor service**: http://localhost:8000

## Environment Configuration

### Development (.env)
- Uses file storage by default
- Imagor in unsafe mode for development
- Permissive CORS settings
- Debug logging enabled

### S3 Configuration (.env.s3.example)
Template for S3 storage configuration with AWS or S3-compatible services.

## Storage Options

### File Storage (Default)
- Images stored in `server/storage/`
- Suitable for development and single-server deployments
- No external dependencies

### S3 Storage
- Compatible with AWS S3 and S3-compatible services
- Configure using S3 environment variables from `.env.s3.example`

## Image Processing

The application uses [Imagor](https://github.com/cshum/imagor) for:
- Dynamic thumbnail generation
- Image resizing and optimization
- EXIF metadata extraction
- Multiple output formats

### Thumbnail Sizes
- **Grid**: 300x225 (gallery grid view)
- **Preview**: 800x600 (preview modal)
- **Full**: 1200x900 (full-size view)
- **Original**: Unprocessed original image

## Development

### Prerequisites
- Go 1.21+
- Node.js 18+
- Docker and Docker Compose

### Backend Development
```bash
cd server
go mod download
make test
make run
```

### Frontend Development
```bash
cd web
npm install
npm run dev
npm run build
```

### Testing
```bash
# Backend tests
cd server && make test

# Frontend tests
cd web && npm test
```

## API Documentation

The application provides a GraphQL API with the following main operations:

- **Authentication**: Login, registration, JWT management
- **Storage**: File listing, image metadata
- **Gallery**: Folder navigation, image browsing

## First Run Setup

1. Start the application using the quick start guide above
2. Navigate to the frontend URL
3. Complete the admin user registration
4. Upload images to `server/storage/` or configure S3 storage
5. Browse your image gallery!

## Troubleshooting

### Common Issues

**Port conflicts**: If ports 8080, 5173, or 8000 are in use, stop other services or modify the configuration.

**Docker issues**: Ensure Docker is running and you have sufficient permissions.

**Storage permissions**: Ensure the `server/storage/` directory is writable.

### Logs

- **Backend logs**: Check the terminal running `make run`
- **Frontend logs**: Check the browser console and Vite terminal
- **Imagor logs**: `docker compose logs imagor`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

[Add your license information here]

## Support

For issues and questions:
- Check the [Issues](../../issues) page
- Review the [Testing Guide](TESTING_GUIDE.md)
