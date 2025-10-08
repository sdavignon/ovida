# Deployment Guide

## Overview
This repository uses GitHub Actions to automatically deploy the Ovida web application to DreamHost VPS when changes are pushed to the `main` branch.

## Deployment Status: ✅ Fixed & Ready for Configuration

### What's Fixed
- ✅ Resolved merge conflicts in deployment workflow
- ✅ Updated to modern Next.js build process (removed deprecated `next export`)
- ✅ Updated pnpm action to latest version
- ✅ Added build verification steps
- ✅ Created alternative deployment method for better reliability

### What's Required (Manual Setup)
🚨 **You must configure GitHub repository secrets before deployment will work.**

## Configuration Instructions

### Step 1: Add Repository Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **"New repository secret"** and add each of the following:

| Secret Name | Value |
|------------|--------|
| `SSH_HOST` | `vps66687.dreamhostps.com` |
| `SSH_USER` | `dh_rt2c39` |
| `SSH_PASSWORD` | `$t3FjqpSzKM&%H@ZrZ7fpRaj_` |
| `SSH_PORT` | `22` |

### Step 2: Add Repository Variables

1. In the same **Actions** secrets page, click the **"Variables"** tab
2. Click **"New repository variable"** and add:

| Variable Name | Value |
|--------------|--------|
| `REMOTE_PATH` | `/home/dh_rt2c39/ovida.1976.cloud/` |

> **Note**: You may need to verify the correct path by SSH-ing into your server first.

### Step 3: Verify Remote Path

SSH into your server to confirm the deployment directory:

```bash
ssh dh_rt2c39@vps66687.dreamhostps.com
# Enter password when prompted

# Check current directory and list contents
pwd
ls -la

# Look for your domain directory
ls -la /home/dh_rt2c39/
```

Common DreamHost directory structures:
- `/home/dh_rt2c39/ovida.1976.cloud/` (subdomain setup)
- `/home/dh_rt2c39/public_html/` (main domain)
- `/home/dh_rt2c39/yourdomain.com/` (custom domain)

Update the `REMOTE_PATH` variable if needed.

## Deployment Methods

### Primary: SFTP Deployment
- **Workflow**: `.github/workflows/deploy.yml`
- **Trigger**: Automatic on push to `main` branch
- **Method**: SFTP upload using password authentication

### Alternative: SSH/SCP Deployment
- **Workflow**: `.github/workflows/deploy-alternative.yml`
- **Trigger**: Manual only (workflow_dispatch)
- **Method**: SSH commands + SCP file transfer
- **Benefits**: Better error reporting, file permission handling

## Testing Your Deployment

### Option 1: Push to Main Branch
```bash
git add .
git commit -m "Test deployment"
git push origin main
```

### Option 2: Manual Workflow Run
1. Go to **Actions** tab in your repository
2. Select "Deploy Ovida Web (Static → DreamHost)"
3. Click **"Run workflow"**
4. Monitor the progress and logs

### Option 3: Test Alternative Method
1. Go to **Actions** tab
2. Select "Deploy Ovida Web (Alternative Method)"
3. Click **"Run workflow"**

## Troubleshooting

### Common Issues

#### ❌ "Host key verification failed"
**Solution**: The workflow will handle this automatically with host key scanning.

#### ❌ "Permission denied (publickey,password)"
**Causes**:
- Incorrect SSH credentials
- Server SSH configuration issues

**Solutions**:
1. Verify credentials by testing manual SSH connection
2. Check if password authentication is enabled on server
3. Consider switching to SSH key authentication

#### ❌ "No such file or directory" on server
**Causes**:
- Incorrect `REMOTE_PATH` variable
- Directory doesn't exist on server

**Solutions**:
1. SSH into server and verify correct path
2. Create the directory manually if needed:
   ```bash
   mkdir -p /home/dh_rt2c39/ovida.1976.cloud/
   ```

#### ❌ Build fails with "Module not found"
**Causes**:
- Missing dependencies
- TypeScript errors

**Solutions**:
1. Check the build logs in GitHub Actions
2. Test build locally: `pnpm --filter @ovida/web build`
3. Fix any TypeScript or dependency issues

### Monitoring Deployments

- Check **Actions** tab for workflow runs and logs
- Look for green checkmarks (success) or red X's (failure)
- Click on individual workflow runs to see detailed logs
- If deployment succeeds but site doesn't update, check:
  - File permissions on server
  - Web server configuration
  - Browser cache

## Security Recommendations

### Switch to SSH Keys (Recommended)
Instead of password authentication, set up SSH key pairs:

1. Generate SSH key pair locally:
   ```bash
   ssh-keygen -t ed25519 -f ~/.ssh/dreamhost_deploy
   ```

2. Add public key to server:
   ```bash
   ssh-copy-id -i ~/.ssh/dreamhost_deploy.pub dh_rt2c39@vps66687.dreamhostps.com
   ```

3. Update GitHub secrets:
   - Remove `SSH_PASSWORD`
   - Add `SSH_PRIVATE_KEY` with the private key content

4. Update workflow to use key authentication instead of password

### Environment Variables
- Keep all sensitive information in GitHub secrets
- Never commit credentials to the repository
- Use environment-specific configurations when needed

## Support

If you continue to experience issues:
1. Check the GitHub Actions logs for specific error messages
2. Test SSH connection manually to verify credentials
3. Verify the remote path exists and is writable
4. Consider the alternative deployment method for better debugging

---

**Last Updated**: October 2025  
**Status**: Ready for deployment after secret configuration