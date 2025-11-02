# Docker Swarm Deployment Guide

This guide covers deploying the PTT application to Docker Swarm with Traefik reverse proxy.

## Prerequisites

- Docker Swarm initialized
- Traefik running on the `traefik-public` network
- Domain configured: `ptt.steinmetz.ltd`
- Environment variables configured

## Environment Variables

Create a `.env` file with your Supabase credentials:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Build the Docker Image

```bash
# Build the image
docker build -t ptt-app:latest .

# Tag for your registry (optional)
docker tag ptt-app:latest your-registry/ptt-app:latest

# Push to registry (optional)
docker push your-registry/ptt-app:latest
```

## Deploy to Swarm

### Option 1: Deploy with local image

```bash
# Deploy the stack
docker stack deploy -c docker-compose.yml ptt
```

### Option 2: Deploy with registry image

Update `docker-compose.yml` to use your registry:

```yaml
services:
  ptt-app:
    image: your-registry/ptt-app:latest
```

Then deploy:

```bash
docker stack deploy -c docker-compose.yml ptt
```

## Verify Deployment

```bash
# Check services
docker service ls

# Check service logs
docker service logs ptt_ptt-app

# Check service status
docker service ps ptt_ptt-app
```

## Configuration

### Custom Domain

Update the `docker-compose.yml` Traefik rule:

```yaml
- "traefik.http.routers.ptt-app.rule=Host(`your-domain.com`)"
```

### Multiple Domains

```yaml
- "traefik.http.routers.ptt-app.rule=Host(`ptt.steinmetz.ltd`) || Host(`www.ptt.steinmetz.ltd`)"
```

### WWW Redirect

To redirect www to non-www, uncomment these lines in `docker-compose.yml`:

```yaml
- "traefik.http.middlewares.ptt-www-redirect.redirectregex.regex=^https://www.ptt.steinmetz.ltd/(.*)"
- "traefik.http.middlewares.ptt-www-redirect.redirectregex.replacement=https://ptt.steinmetz.ltd/$${1}"
- "traefik.http.routers.ptt-app.middlewares=ptt-www-redirect,ptt-security-headers"
```

### Scaling

Scale the service:

```bash
# Scale to 4 replicas
docker service scale ptt_ptt-app=4

# Or update docker-compose.yml and redeploy
```

## Updates and Rollbacks

### Update the application

```bash
# Build new image
docker build -t ptt-app:latest .

# Update the service
docker service update --image ptt-app:latest ptt_ptt-app

# Or redeploy the stack
docker stack deploy -c docker-compose.yml ptt
```

### Rollback

```bash
# Rollback to previous version
docker service rollback ptt_ptt-app
```

## Health Checks

The application includes:
- Nginx health check at `/health`
- Docker health check every 30s
- Traefik health check every 30s

Check health status:

```bash
# View service health
docker service ps ptt_ptt-app --no-trunc

# Test health endpoint directly
curl http://localhost/health
```

## Troubleshooting

### Service not starting

```bash
# Check service logs
docker service logs ptt_ptt-app --tail 100

# Check node where service is running
docker node ls
docker service ps ptt_ptt-app --no-trunc
```

### SSL certificate issues

Make sure:
1. Domain DNS points to your server
2. Traefik is configured with Let's Encrypt
3. Port 80 and 443 are open

### Environment variables not working

Environment variables must be set at build time for Expo:

```bash
# Build with env vars
docker build \
  --build-arg EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL \
  --build-arg EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY \
  -t ptt-app:latest .
```

Or better yet, update the Dockerfile to accept build args:

```dockerfile
ARG EXPO_PUBLIC_SUPABASE_URL
ARG EXPO_PUBLIC_SUPABASE_ANON_KEY

ENV EXPO_PUBLIC_SUPABASE_URL=$EXPO_PUBLIC_SUPABASE_URL
ENV EXPO_PUBLIC_SUPABASE_ANON_KEY=$EXPO_PUBLIC_SUPABASE_ANON_KEY
```

## Remove Deployment

```bash
# Remove the stack
docker stack rm ptt

# Remove the image (optional)
docker rmi ptt-app:latest
```

## Production Checklist

- [ ] Environment variables configured
- [ ] Domain DNS configured
- [ ] SSL certificates working
- [ ] Health checks passing
- [ ] Logs are accessible
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Resource limits set (optional)
- [ ] Multiple replicas for HA

## Resource Limits (Optional)

Add resource limits to `docker-compose.yml`:

```yaml
deploy:
  replicas: 2
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
```

## Monitoring

Monitor with:

```bash
# Watch service status
watch docker service ps ptt_ptt-app

# Real-time logs
docker service logs -f ptt_ptt-app

# Service stats
docker stats $(docker ps -q -f "label=com.docker.swarm.service.name=ptt_ptt-app")
```
