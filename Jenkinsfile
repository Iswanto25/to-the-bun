pipeline {
    agent any

    options {
        timestamps()
        timeout(time: 30, unit: 'MINUTES')
        disableConcurrentBuilds()
        buildDiscarder(logRotator(numToKeepStr: '20', artifactNumToKeepStr: '10'))
    }

    environment {
        APP_NAME        = "boilerplate-expressjs"
        APP_DIR         = "/opt/docker/app-staging/boilerplate-expressjs"
        COMPOSE_FILE    = "docker-compose.staging.yml"
        PROJECT_NAME    = "boilerplate-expressjs"
        DOCKER_BUILDKIT = "1"
        COMPOSE_DOCKER_CLI_BUILD = "1"
        DATABASE_URL    = "postgresql://dummy:dummy@localhost:5432/dummy"
    }

    // ───  S T A G E S  ────────────────────────────────────────────

    stages {

        // =========================================================
        //  1. SETUP
        // =========================================================
        stage('Setup') {
            steps {
                sh '''
                set -e
                echo "📦 [Setup] Installing dependencies..."
                docker run --rm \
                    -v "$WORKSPACE":"$WORKSPACE" \
                    -w "$WORKSPACE" \
                    oven/bun:1-alpine \
                    bun install --frozen-lockfile

                echo "🧬 [Setup] Generating Prisma client..."
                docker run --rm \
                    -v "$WORKSPACE":"$WORKSPACE" \
                    -w "$WORKSPACE" \
                    -e DATABASE_URL="$DATABASE_URL" \
                    oven/bun:1-alpine \
                    bunx prisma generate
                '''
            }
        }

        // =========================================================
        //  2. VERIFY — Lint, Type Check & Tests (parallel)
        //     Dijalankan paralel agar feedback cepat dan semua
        //     kegagalan terlihat sekaligus dalam satu run.
        // =========================================================
        stage('Verify') {
            parallel {

                stage('Lint') {
                    steps {
                        sh '''
                        set -e
                        echo "🔍 [Lint] Running ESLint on src, tests, scripts, prisma..."
                        docker run --rm \
                            -v "$WORKSPACE":"$WORKSPACE" \
                            -w "$WORKSPACE" \
                            oven/bun:1-alpine \
                            bun run lint
                        '''
                    }
                }

                stage('Type Check') {
                    steps {
                        sh '''
                        set -e
                        echo "🔎 [Type Check] Running tsc --noEmit (noUnusedLocals, noUnusedParameters)..."
                        docker run --rm \
                            -v "$WORKSPACE":"$WORKSPACE" \
                            -w "$WORKSPACE" \
                            -e DATABASE_URL="$DATABASE_URL" \
                            oven/bun:1-alpine \
                            bun run typecheck
                        '''
                    }
                }

                stage('Unit Test') {
                    steps {
                        sh '''
                        set -e
                        echo "🧪 [Unit Test] Utils..."
                        docker run --rm \
                            -v "$WORKSPACE":"$WORKSPACE" \
                            -w "$WORKSPACE" \
                            -e DATABASE_URL="$DATABASE_URL" \
                            oven/bun:1-alpine \
                            bun test \
                                src/utils/__tests__/encryption.test.ts \
                                src/utils/__tests__/jwt.test.ts \
                                src/utils/__tests__/logger.test.ts \
                                src/utils/__tests__/pagination.test.ts \
                                src/utils/__tests__/utils.test.ts

                        echo "🧪 [Unit Test] Middlewares..."
                        docker run --rm \
                            -v "$WORKSPACE":"$WORKSPACE" \
                            -w "$WORKSPACE" \
                            -e DATABASE_URL="$DATABASE_URL" \
                            oven/bun:1-alpine \
                            sh -c "bun test __tests__/middlewares/errorHandler.middleware.test.ts && bun test __tests__/middlewares/auth.middleware.test.ts && bun test __tests__/middlewares/rbac.middleware.test.ts"

                        echo "🧪 [Unit Test] Auth Services..."
                        docker run --rm \
                            -v "$WORKSPACE":"$WORKSPACE" \
                            -w "$WORKSPACE" \
                            -e DATABASE_URL="$DATABASE_URL" \
                            oven/bun:1-alpine \
                            bun test src/features/auth/services/auth.service.spec.ts

                        echo "🧪 [Unit Test] Auth Controllers..."
                        docker run --rm \
                            -v "$WORKSPACE":"$WORKSPACE" \
                            -w "$WORKSPACE" \
                            -e DATABASE_URL="$DATABASE_URL" \
                            oven/bun:1-alpine \
                            bun test src/features/auth/controllers/auth.controller.spec.ts
                        '''
                    }
                }

                stage('Integration Test') {
                    steps {
                        sh '''
                        set -e
                        echo "🔗 [Integration Test] Running integration tests..."
                        docker run --rm \
                            -v "$WORKSPACE":"$WORKSPACE" \
                            -w "$WORKSPACE" \
                            -e DATABASE_URL="$DATABASE_URL" \
                            oven/bun:1-alpine \
                            bun test __tests__/integration/
                        '''
                    }
                }

            }
        }

        // =========================================================
        //  5. BUILD
        // =========================================================
        stage('Build') {
            steps {
                sh '''
                set -e
                echo "🏗️  [Build] Compiling TypeScript..."
                docker run --rm \
                    -v "$WORKSPACE":"$WORKSPACE" \
                    -w "$WORKSPACE" \
                    -e DATABASE_URL="$DATABASE_URL" \
                    oven/bun:1-alpine \
                    bun run build
                '''
            }
        }

        // =========================================================
        //  6. STOP RUNNING CONTAINERS
        // =========================================================
        stage('Stop Containers') {
            steps {
                sh '''
                set -e
                echo "🛑 [Deploy] Stopping old containers..."
                docker run --rm \
                    -v /var/run/docker.sock:/var/run/docker.sock \
                    -v /opt/docker/app-staging:/opt/docker/app-staging \
                    -w ${APP_DIR} \
                    docker \
                    compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} down --remove-orphans --timeout 30 2>/dev/null || true

                docker stop ${PROJECT_NAME} ${PROJECT_NAME}-worker 2>/dev/null || true
                docker rm -f ${PROJECT_NAME} ${PROJECT_NAME}-worker 2>/dev/null || true
                echo "Container lama sudah dihentikan."
                '''
            }
        }

        // =========================================================
        //  7. BACKUP
        // =========================================================
        stage('Backup') {
            steps {
                sh '''
                set -e
                BACKUP_DIR="/opt/docker/app-staging/${PROJECT_NAME}_backup_$(date +%Y%m%d_%H%M%S)"

                echo "📁 [Deploy] Ensuring target directory exists..."
                docker run --rm \
                    -v /opt/docker/app-staging:/opt/docker/app-staging \
                    alpine sh -c "mkdir -p '${APP_DIR}'"

                echo "📦 [Deploy] Backing up old source to ${BACKUP_DIR}..."
                docker run --rm \
                    -v /opt/docker/app-staging:/opt/docker/app-staging \
                    alpine sh -c "cp -r '${APP_DIR}' '${BACKUP_DIR}' || true"
                '''
            }
        }

        // =========================================================
        //  8. UPDATE SOURCE CODE
        // =========================================================
        stage('Update Source') {
            steps {
                sh '''
                set -e
                echo "🚚 [Deploy] Copying new source code..."
                docker run --rm \
                    -v /opt/docker/app-staging:/opt/docker/app-staging \
                    alpine sh -c "rm -rf '${APP_DIR}'/*"

                HELPER_ID=$(docker create -v /opt/docker/app-staging:/opt/docker/app-staging alpine)
                docker cp "$WORKSPACE/." "$HELPER_ID:${APP_DIR}/"
                docker rm -v "$HELPER_ID"
                '''
            }
        }

        // =========================================================
        //  9. BUILD IMAGE
        // =========================================================
        stage('Build Image') {
            steps {
                sh '''
                set -e
                echo "🔧 [Deploy] Building Docker image..."
                docker run --rm \
                    -e DOCKER_BUILDKIT=1 \
                    -v /var/run/docker.sock:/var/run/docker.sock \
                    -v /opt/docker/app-staging:/opt/docker/app-staging \
                    -w ${APP_DIR} \
                    docker \
                    compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} build
                '''
            }
        }

        // =========================================================
        //  10. DEPLOY
        // =========================================================
        stage('Deploy') {
            steps {
                sh '''
                set -e
                echo "🚀 [Deploy] Starting services..."
                docker run --rm \
                    -v /var/run/docker.sock:/var/run/docker.sock \
                    -v /opt/docker/app-staging:/opt/docker/app-staging \
                    -w ${APP_DIR} \
                    docker \
                    compose -f ${COMPOSE_FILE} -p ${PROJECT_NAME} up -d --force-recreate --remove-orphans
                '''
            }
        }

        // =========================================================
        //  11. HEALTH CHECK
        // =========================================================
        stage('Health Check') {
            steps {
                sh '''
                echo "🏥 [Health Check] Verifying API server..."
                sleep 15

                HEALTH="starting"
                for i in $(seq 1 12); do
                    HEALTH=$(docker inspect --format="{{.State.Health.Status}}" boilerplate-express-backend 2>/dev/null || echo "unknown")
                    if [ "$HEALTH" = "healthy" ]; then
                        echo "✅ API server sehat (Docker health: healthy)"
                        break
                    fi
                    echo "Menunggu server siap... ($i/12) [status: $HEALTH]"
                    sleep 5
                done

                if [ "$HEALTH" != "healthy" ]; then
                    echo "❌ API server tidak merespon! Health status: $HEALTH"
                    docker logs boilerplate-express-backend --tail 50 2>&1 || true
                    exit 1
                fi
                '''
            }
        }

        // =========================================================
        //  11b. MIGRATE & SEED
        // =========================================================
        stage('Migrate & Seed') {
            steps {
                sh '''
                echo "🗄️ [Database] Running Prisma migrations and seeding..."
                docker exec boilerplate-express-backend sh -c "bunx prisma migrate deploy && bunx prisma db seed" || echo "⚠️ Migrate/Seed failed or skipped"
                '''
            }
        }

        // =========================================================
        //  12. CLEANUP
        // =========================================================
        stage('Cleanup') {
            steps {
                sh '''
                echo "🧽 [Cleanup] Removing old backups and unused images..."
                docker run --rm \
                    -v /opt/docker/app-staging:/opt/docker/app-staging \
                    alpine sh -c "find /opt/docker/app-staging/ -name '*_backup_*' -type d -ctime +1 -exec rm -rf {} +"
                docker image prune -f
                '''
            }
        }

        // =========================================================
        //  13. NOTIFY
        // =========================================================
        stage('Notify') {
            steps {
                sh '''
                COMMIT_MSG=$(git log -1 --pretty=%B 2>/dev/null || echo "N/A")
                echo ""
                echo "========================================"
                echo "  🎯  Deployment sukses!"
                echo "  App     : ${APP_NAME}"
                echo "  Job     : ${JOB_NAME}"
                echo "  Build   : #${BUILD_NUMBER}"
                echo "  Branch  : ${BRANCH_NAME}"
                echo "  Commit  : ${GIT_COMMIT}"
                echo "  Message : ${COMMIT_MSG}"
                echo "========================================"
                echo ""
                '''
            }
        }

    } // end stages

    // ───  P O S T   A C T I O N S  ───────────────────────────────

    post {
        failure {
            sh '''
            echo ""
            echo "========================================"
            echo "  ❌  Pipeline gagal!"
            echo "  Stage  : ${STAGE_NAME}"
            echo "  Job    : ${JOB_NAME}"
            echo "  Build  : #${BUILD_NUMBER}"
            echo "========================================"
            echo ""
            echo "📋 Log container — backend:"
            docker logs boilerplate-express-backend --tail 30 2>&1 || true
            echo ""
            echo "📋 Log container — worker:"
            docker logs boilerplate-express-worker --tail 30 2>&1 || true
            echo ""
            '''
        }

        success {
            sh '''
            echo "✅ Pipeline selesai tanpa error."
            '''
        }
    }

}
