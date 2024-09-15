# Imagor Studio

Imagor Studio is a file explorer application with a React frontend and a Go backend.

## Backend Setup

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Install dependencies:
   ```
   go mod download
   ```

3. Set up environment variables (you can create a `.env` file in the `server` directory):
   ```
   PORT=8080
   STORAGE_TYPE=filesystem  # or "s3"
   FILESYS_ROOT=./files     # for filesystem storage
   S3_BUCKET=your-bucket    # for S3 storage
   S3_REGION=your-region    # for S3 storage
   ```

4. Run the server:
   ```
   go run cmd/server/main.go
   ```

The GraphQL playground will be available at `http://localhost:8080`.

## Frontend Setup

1. Navigate to the web directory:
   ```
   cd web
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Run the development server:
   ```
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`.

## Building for Production

### Backend

1. Navigate to the server directory:
   ```
   cd server
   ```

2. Build the binary:
   ```
   go build -o imagor-studio-server cmd/server/main.go
   ```

3. Run the binary:
   ```
   ./imagor-studio-server
   ```

### Frontend

1. Navigate to the web directory:
   ```
   cd web
   ```

2. Build the frontend:
   ```
   npm run build
   ```

3. The built files will be in the `dist` directory. Serve these files with a static file server of your choice.

## License

[MIT License](LICENSE)
