# Ovida Deployment

This repository is configured to deploy the site to DreamHost (directory `ovida.1976.cloud`) via GitHub Actions. The workflow packages the repository contents and publishes them to the remote server over SFTP whenever changes are merged into `main` or when triggered manually.

## Repository structure

- `.github/workflows/deploy.yml` – CI/CD workflow that builds the deployment package and publishes it to DreamHost via SFTP.
- `.gitignore` – prevents the temporary `deploy/` directory created during the workflow from being committed.

## Requirements

1. The DreamHost SFTP account must already exist. For this project the target path is `ovida.1976.cloud/`.
2. GitHub repository secrets must be configured so that the workflow can connect to the remote server securely.

### Required GitHub secrets

Create the following secrets in the GitHub repository settings (`Settings → Secrets and variables → Actions`).

| Secret name | Description |
|-------------|-------------|
| `SFTP_HOST` | DreamHost hostname (`vps66687.dreamhostps.com`). |
| `SFTP_USERNAME` | DreamHost SFTP username (`dh_rt2c39`). |
| `SFTP_PASSWORD` | Password for the SFTP account (leave blank if using SSH key auth). |
| `SFTP_PORT` | Optional port override (defaults to `22` if left empty). |
| `SFTP_SSH_KEY` | Optional private SSH key (PEM format, leave blank when using passwords). |

> **Note**: Provide **either** `SFTP_PASSWORD` **or** `SFTP_SSH_KEY`. The workflow supports both methods but only one is required.

## How the workflow works

1. **Checkout** – pulls the repository contents.
2. **Prepare deployment package** – copies repository files into a temporary `deploy/` directory, excluding Git metadata and workflow files.
3. **Deploy** – uploads the `deploy/` directory to DreamHost using SFTP, synchronising and deleting files that no longer exist in the repository.

## Running the workflow manually

1. Push your changes to the `main` branch or create a pull request and merge it into `main`.
2. Alternatively, from the GitHub repository UI go to `Actions → Deploy to DreamHost → Run workflow` to trigger it on demand (you can select any branch when manually running).

## Verifying the deployment

- Once the workflow succeeds, access `https://ovida.1976.cloud/` to confirm the latest version is served.
- You can also inspect the workflow logs under the `Actions` tab for upload details.

## Local deployment testing (optional)

If you need to validate SFTP credentials locally, you can run the following command (requires `lftp`):

```bash
lftp -u "$SFTP_USERNAME","$SFTP_PASSWORD" sftp://$SFTP_HOST
```

Once connected, you can navigate to `ovida.1976.cloud/` and verify permissions.

Remember never to commit secrets to the repository; always use GitHub Secrets.
