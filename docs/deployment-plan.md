# Deployment Plan: SSH/SFTP via GitHub Actions

## 1. Repository review
- `.github/workflows/deploy.yml` currently checks out the repository, mirrors it into a `deploy/` folder with `rsync`, and pushes everything to the target server using `SamKirkland/FTP-Deploy-Action` over SFTP.
- Secrets expected today: `SFTP_HOST`, `SFTP_USERNAME`, `SFTP_PASSWORD`, `SFTP_SSH_KEY`, `SFTP_PORT`, and `SFTP_REMOTE_DIR`. The workflow also allows overriding those values manually via `workflow_dispatch` inputs.
- Observed limitations:
  - The pipeline uploads raw source files; there is no install/build/test phase to ensure production artifacts are generated and validated.
  - There is no integrity check or release versioning—the upload overwrites the remote directory directly, making rollbacks difficult.
  - Authentication prioritizes password use if available, increasing risk compared with SSH keys only.
  - No remote post-deploy actions are executed (e.g., installing dependencies, migrating databases, restarting services).
  - Secrets naming is tied to FTP vocabulary; secrets should be renamed for clarity when refactoring.

## 2. Goals for the new workflow
- Trigger deployments automatically on pushes to `main` while allowing manual redeployments via `workflow_dispatch`.
- Produce production-ready build artifacts within the CI environment before uploading.
- Transfer artifacts via SSH/SFTP using key-based authentication stored in GitHub Secrets.
- Maintain atomic, versioned releases with the ability to roll back quickly.
- Run remote post-deployment steps (dependency install, migrations, service restart) safely.
- Keep credentials out of the repository and audit access through GitHub environments.

## 3. Required prerequisites
1. **Server configuration**
   - Provision a deploy-only user (e.g., `ovida-deploy`) with ownership of `/var/www/ovida` (or equivalent) and permission to restart the application service (PM2 or systemd).
   - Install Node.js and PNPM versions matching the project, plus process manager tooling (PM2/systemd) and Prisma CLI if migrations are required.
   - Create directories: `/var/www/ovida/releases`, `/var/www/ovida/current`, `/var/www/ovida/shared`.
2. **SSH key management**
   - Generate a dedicated key pair on a secure machine: `ssh-keygen -t ed25519 -C "github-deploy@ovida"`.
   - Add the public key to `~ovida-deploy/.ssh/authorized_keys`.
   - Store the private key in GitHub as `DEPLOY_SSH_KEY`.
3. **GitHub secrets/environment**
   - `DEPLOY_HOST`: server hostname/IP.
   - `DEPLOY_PORT`: SSH port (default `22`).
   - `DEPLOY_USER`: deploy username.
   - `DEPLOY_PATH`: base directory on server (e.g., `/var/www/ovida`).
   - `DEPLOY_SSH_KEY`: private key contents.
   - `DEPLOY_ENV`: (optional) `.env.production` contents or reference to GitHub environment-protected secrets.
   - Optionally define a GitHub `production` environment to gate deployments with approvals and auditable secrets.

## 4. Proposed GitHub Actions workflow structure
Refactor `.github/workflows/deploy.yml` to the following outline:

```yaml
name: Deploy via SFTP

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup PNPM
        uses: pnpm/action-setup@v3
        with:
          version: 8

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version-file: '.nvmrc'
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Run tests
        run: pnpm test --filter web --if-present

      - name: Build production artifacts
        run: pnpm --filter web build

      - name: Package release
        run: |
          set -euo pipefail
          RELEASE_NAME="release-$(date +%Y%m%d%H%M%S)"
          mkdir -p artifacts
          tar czf artifacts/$RELEASE_NAME.tar.gz \
            apps/web/.next \
            apps/web/public \
            package.json \
            pnpm-lock.yaml
          echo "RELEASE_NAME=$RELEASE_NAME" >> "$GITHUB_ENV"

      - name: Upload bundle to server
        uses: appleboy/scp-action@v0.1.7
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          port: ${{ secrets.DEPLOY_PORT }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          source: artifacts/${{ env.RELEASE_NAME }}.tar.gz
          target: ${{ secrets.DEPLOY_PATH }}/releases

      - name: Deploy and activate release
        uses: appleboy/ssh-action@v0.1.7
        with:
          host: ${{ secrets.DEPLOY_HOST }}
          username: ${{ secrets.DEPLOY_USER }}
          port: ${{ secrets.DEPLOY_PORT }}
          key: ${{ secrets.DEPLOY_SSH_KEY }}
          script: |
            set -euo pipefail
            cd ${{ secrets.DEPLOY_PATH }}
            mkdir -p releases current shared
            tar xzf releases/${{ env.RELEASE_NAME }}.tar.gz -C releases
            ln -sfn releases/${{ env.RELEASE_NAME }} current
            if [ -n "${{ secrets.DEPLOY_ENV }}" ]; then
              echo "${{ secrets.DEPLOY_ENV }}" > shared/.env.production
            fi
            if [ -f shared/.env.production ]; then
              ln -sfn ../shared/.env.production current/.env.production
            fi
            if command -v pnpm >/dev/null 2>&1; then
              cd current
              pnpm install --prod --frozen-lockfile
            fi
            if [ -f current/prisma/schema.prisma ]; then
              cd current
              pnpm exec prisma migrate deploy
            fi
            if [ -f current/ecosystem.config.cjs ]; then
              pm2 reload ecosystem.config.cjs || pm2 start ecosystem.config.cjs
            elif command -v systemctl >/dev/null 2>&1; then
              sudo systemctl restart ovida
            fi
```

### Improvements over current workflow
- Builds artifacts before deployment, ensuring only production assets are transferred.
- Uses timestamped release archives for atomic deployments and easy rollbacks.
- Encourages SSH key-only auth (no password secret required).
- Provides hook points for migrations and service restarts.
- Can be extended to upload checksums and verify integrity before activation.

## 5. Hardening & reliability recommendations
- **Integrity checks**: generate SHA-256 checksums in CI and validate on the server before extraction.
- **Atomic symlink switch**: keep `current` as a symlink to the active release; retain the previous release for fast rollback (`ln -sfn releases/$OLD_RELEASE current`).
- **Backups**: back up persistent data (databases, uploads) before switching releases; integrate with existing backup tooling.
- **Monitoring**: emit deployment notifications (Slack, email) using actions like `8398a7/action-slack` after successful deploys/failures.
- **Least privilege**: restrict the deploy user's sudoers file to only the commands required (e.g., restarting the app service).
- **Secrets rotation**: rotate SSH keys periodically and remove password-based access entirely.

## 6. Rollback process
1. SSH into the server and list available archives in `releases/`.
2. Update the `current` symlink to point at the desired prior release: `ln -sfn releases/<release-name> current`.
3. Restart the application service (PM2/systemd).
4. Optionally, promote the rollback through GitHub Actions by keeping the archive and adding a workflow_dispatch step that selects a release to re-link.

## 7. Optional enhancements
- Add a staging job that runs before production and requires manual approval to promote.
- Cache dependencies/build outputs in GitHub Actions to speed up deployments (`actions/cache` or PNPM cache).
- Integrate smoke tests after deployment using SSH commands or HTTP checks to confirm the service is healthy.
- Store `.env.production` and other secrets as GitHub Actions secrets and inject them via `DEPLOY_ENV`, or use `scp-action` to upload managed configuration files from the workflow.
- Expand artifact packaging for other apps (`apps/api`, `apps/ws`) by building each service separately and packaging them into the release archive.

## 8. Next steps
1. Rename or archive the existing workflow to avoid accidental runs during migration.
2. Implement the refactored workflow described above and update secrets to the new naming convention.
3. Test end-to-end on a staging server, validating deployment, rollback, and monitoring.
4. Document operational runbooks (deploy, rollback, troubleshooting) for the engineering/on-call team.
