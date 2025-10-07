# Continuous Integration setup

To activate the built-in GitHub Actions workflow for this repository you only need to
provision the connection details it uses during deployment. Follow these steps:

1. Open the repository on GitHub and navigate to **Settings → Secrets and variables → Actions**.
2. Create the following entries so the `Deploy via SFTP` workflow defined in
   [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) can publish the bundle that is
   produced in CI:

   | Name | Type | Purpose |
   | ---- | ---- | ------- |
   | `SFTP_HOST` | Secret **or** variable | Default hostname of the SFTP server that receives the deploy bundle. |
   | `SFTP_USERNAME` | Secret **or** variable | Account name used to authenticate with the SFTP host. |
   | `SFTP_PASSWORD` | Secret | Password for the account above. Omit this when you rely on SSH keys. |
   | `SFTP_SSH_KEY` | Secret | Private SSH key in PEM format. Provide this when you prefer key-based authentication. |
   | `SFTP_PORT` | Secret **or** variable | Optional port override (defaults to `22` when omitted). |
   | `SFTP_REMOTE_DIR` | Secret **or** variable | Target directory on the host (for example `/var/www/html/`). |

3. Trigger the workflow by either pushing to the `main` branch or by running it manually from
   **Actions → Deploy via SFTP → Run workflow**. Manual runs allow you to override any of the values
   above via the dispatch form.

Once the secrets are in place, every CI execution will bundle the repository, upload it to the
configured SFTP host, and keep the remote directory in sync with the committed code.
