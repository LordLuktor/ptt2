# Docker Swarm Quick Start

## Prerequisites

1. Docker Swarm initialized
2. Traefik running on `traefik-public` network
3. `.env` file with Supabase credentials

## Web Build Status

✅ **Web build is tested and working!**
- Build size: ~3.2MB JavaScript bundle
- Platform: React Native Web with Expo Router
- Server: Nginx serving static files
- Output: `dist/` directory

### Test Build Locally

```bash
# Test the web build
./test-build.sh

# Serve locally to test
npx serve dist
# or
python3 -m http.server 8000 --directory dist
```

## Quick Deploy

### 1. Create `.env` file

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 2. Run deployment script

```bash
./build-and-deploy.sh
```

That's it! Your app will be available at `https://ptt.steinmetz.ltd`

## Manual Deploy

If you prefer manual steps:

```bash
# 1. Load environment variables
source .env

# 2. Build image
docker build \
  --build-arg EXPO_PUBLIC_SUPABASE_URL="$EXPO_PUBLIC_SUPABASE_URL" \
  --build-arg EXPO_PUBLIC_SUPABASE_ANON_KEY="$EXPO_PUBLIC_SUPABASE_ANON_KEY" \
  -t ptt-app:latest .

# 3. Deploy to swarm
docker stack deploy -c docker-compose.yml ptt
```

## Useful Commands

```bash
# Check service status
docker service ls
docker service ps ptt_ptt-app

# View logs
docker service logs -f ptt_ptt-app

# Scale service
docker service scale ptt_ptt-app=4

# Update service
./build-and-deploy.sh

# Remove deployment
docker stack rm ptt
```

## Configuration

Edit `docker-compose.yml` to change:

- **Domain**: Update `Host()` in Traefik rule
- **Replicas**: Change `replicas:` count
- **Resources**: Add resource limits if needed

## Troubleshooting

### Service not starting

```bash
docker service logs ptt_ptt-app --tail 100
```

### Check which node is running the service

```bash
docker service ps ptt_ptt-app --no-trunc
```

### Test locally before deploy

```bash
docker-compose up
# Access at http://localhost
```

For detailed documentation, see `DEPLOYMENT.md`
