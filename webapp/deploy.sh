#!/bin/bash

# Kakarama Room Dashboard Deployment Script
# Usage: ./deploy.sh [environment] [action]
# Environment: dev, staging, prod
# Action: build, deploy, restart, logs, backup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
ENVIRONMENT=${1:-prod}
ACTION=${2:-deploy}
PROJECT_NAME="kakarama-room"
BACKUP_DIR="./backups"
LOG_FILE="./deploy.log"

# Functions
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}" | tee -a $LOG_FILE
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}" | tee -a $LOG_FILE
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}" | tee -a $LOG_FILE
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO: $1${NC}" | tee -a $LOG_FILE
}

# Check prerequisites
check_prerequisites() {
    log "Checking prerequisites..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed"
    fi
    
    if [ "$ENVIRONMENT" = "prod" ] && [ ! -f ".env" ]; then
        error "Production environment requires .env file"
    fi
    
    log "Prerequisites check passed"
}

# Build application
build_app() {
    log "Building application for $ENVIRONMENT environment..."
    
    # Build frontend
    info "Building frontend..."
    cd frontend
    npm ci --only=production
    npm run build
    cd ..
    
    # Build backend (if needed)
    info "Preparing backend..."
    cd backend
    npm ci --only=production
    cd ..
    
    # Build Docker images
    info "Building Docker images..."
    if [ "$ENVIRONMENT" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml build --no-cache
    else
        docker-compose build --no-cache
    fi
    
    log "Build completed successfully"
}

# Deploy application
deploy_app() {
    log "Deploying application to $ENVIRONMENT environment..."
    
    # Create backup before deployment
    if [ "$ENVIRONMENT" = "prod" ]; then
        create_backup
    fi
    
    # Stop existing containers
    info "Stopping existing containers..."
    if [ "$ENVIRONMENT" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml down
    else
        docker-compose down
    fi
    
    # Start new containers
    info "Starting new containers..."
    if [ "$ENVIRONMENT" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml up -d
    else
        docker-compose up -d
    fi
    
    # Wait for services to be ready
    info "Waiting for services to be ready..."
    sleep 30
    
    # Health check
    health_check
    
    log "Deployment completed successfully"
}

# Health check
health_check() {
    log "Performing health check..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f http://localhost:3001/health > /dev/null 2>&1; then
            log "Health check passed"
            return 0
        fi
        
        info "Health check attempt $attempt/$max_attempts failed, retrying..."
        sleep 10
        ((attempt++))
    done
    
    error "Health check failed after $max_attempts attempts"
}

# Create backup
create_backup() {
    log "Creating backup..."
    
    mkdir -p $BACKUP_DIR
    local backup_file="$BACKUP_DIR/backup-$(date +%Y%m%d-%H%M%S).tar.gz"
    
    # Backup database
    if [ "$ENVIRONMENT" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml exec -T postgres pg_dump -U postgres kakarama_room > "$BACKUP_DIR/db-$(date +%Y%m%d-%H%M%S).sql"
    fi
    
    # Backup application files
    tar -czf $backup_file \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='build' \
        --exclude='.git' \
        --exclude='backups' \
        .
    
    log "Backup created: $backup_file"
}

# Restart services
restart_services() {
    log "Restarting services..."
    
    if [ "$ENVIRONMENT" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml restart
    else
        docker-compose restart
    fi
    
    health_check
    log "Services restarted successfully"
}

# Show logs
show_logs() {
    log "Showing logs for $ENVIRONMENT environment..."
    
    if [ "$ENVIRONMENT" = "prod" ]; then
        docker-compose -f docker-compose.prod.yml logs -f --tail=100
    else
        docker-compose logs -f --tail=100
    fi
}

# Cleanup old backups
cleanup_backups() {
    log "Cleaning up old backups..."
    
    find $BACKUP_DIR -name "backup-*.tar.gz" -mtime +30 -delete
    find $BACKUP_DIR -name "db-*.sql" -mtime +30 -delete
    
    log "Backup cleanup completed"
}

# Main execution
main() {
    log "Starting deployment script for $ENVIRONMENT environment with action: $ACTION"
    
    check_prerequisites
    
    case $ACTION in
        "build")
            build_app
            ;;
        "deploy")
            build_app
            deploy_app
            cleanup_backups
            ;;
        "restart")
            restart_services
            ;;
        "logs")
            show_logs
            ;;
        "backup")
            create_backup
            ;;
        "health")
            health_check
            ;;
        *)
            error "Unknown action: $ACTION. Available actions: build, deploy, restart, logs, backup, health"
            ;;
    esac
    
    log "Script completed successfully"
}

# Run main function
main "$@"
