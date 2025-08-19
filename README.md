
# QueryLinker - Split Architecture

This project has been split into separate frontend and backend applications for better organization and independent deployment.

## Project Structure

```
├── querylinker-backend/     # Node.js/Express backend
│   ├── server/             # All backend code
│   ├── package.json
│   └── tsconfig.json
├── querylinker-frontend/    # React frontend
│   ├── src/               # All frontend code
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Development Setup

### Backend (Port 5000)

```bash
cd querylinker-backend
npm install
cp .env.example .env
# Configure your environment variables
npm run dev
```

### Frontend (Port 3000)

```bash
cd querylinker-frontend
npm install
cp .env.example .env
# Configure your environment variables
npm run dev
```

## Production Deployment

### Backend
- Deploy to any Node.js hosting service
- Ensure environment variables are configured
- Run `npm run build && npm start`

### Frontend
- Deploy to static hosting (Netlify, Vercel, etc.)
- Build with `npm run build`
- Set `VITE_API_URL` to your backend URL

## Key Changes

1. **Separated Dependencies**: Backend only includes server dependencies, frontend only includes React dependencies
2. **Independent Deployment**: Each part can be deployed separately
3. **API Configuration**: Frontend uses proxy in development, environment variables in production
4. **CORS Setup**: Backend configured to accept requests from frontend
5. **Clean Architecture**: Clear separation of concerns

## Development Workflow

1. Start backend server first: `cd querylinker-backend && npm run dev`
2. Start frontend in another terminal: `cd querylinker-frontend && npm run dev`
3. Frontend automatically proxies API requests to backend during development

Both projects can now be developed, tested, and deployed independently while maintaining the same functionality.
