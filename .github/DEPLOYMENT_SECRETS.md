# GitHub Repository Secrets Configuration

This document describes the required secrets for automated CI/CD deployment to AWS EC2.

## Required Secrets

The following secrets must be configured in your GitHub repository settings before the deployment workflow can run successfully.

### 1. EC2_SSH_PRIVATE_KEY

**Description**: Private SSH key for authenticating to the EC2 instance.

**How to generate**:

```bash
# Generate a new SSH key pair (do this on your local machine)
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_deploy

# This creates two files:
# - ~/.ssh/github_actions_deploy (private key - add to GitHub secrets)
# - ~/.ssh/github_actions_deploy.pub (public key - add to EC2)
```

**How to add to EC2**:

```bash
# Copy the public key to your EC2 instance
ssh-copy-id -i ~/.ssh/github_actions_deploy.pub ec2-user@your-ec2-host

# Or manually add it to ~/.ssh/authorized_keys on the EC2 instance
cat ~/.ssh/github_actions_deploy.pub | ssh ec2-user@your-ec2-host "cat >> ~/.ssh/authorized_keys"
```

**How to add to GitHub**:

1. Copy the **private key** content:
   ```bash
   cat ~/.ssh/github_actions_deploy
   ```

2. Go to your GitHub repository → Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Name: `EC2_SSH_PRIVATE_KEY`
5. Value: Paste the entire private key content (including `-----BEGIN OPENSSH PRIVATE KEY-----` and `-----END OPENSSH PRIVATE KEY-----`)
6. Click "Add secret"

### 2. EC2_HOST

**Description**: The hostname or IP address of your EC2 instance.

**Example values**:
- `ec2-12-34-56-78.compute-1.amazonaws.com`
- `12.34.56.78`
- `api.yourdomain.com` (if using a custom domain)

**How to find**:
- AWS Console → EC2 → Instances → Select your instance → Copy "Public IPv4 address" or "Public IPv4 DNS"

**How to add to GitHub**:
1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `EC2_HOST`
4. Value: Your EC2 hostname or IP address
5. Click "Add secret"

### 3. EC2_USER

**Description**: The SSH username for connecting to the EC2 instance.

**Common values**:
- `ec2-user` (Amazon Linux 2)
- `ubuntu` (Ubuntu)
- `admin` (Debian)

**How to add to GitHub**:
1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `EC2_USER`
4. Value: Your EC2 SSH username (e.g., `ec2-user`)
5. Click "Add secret"

### 4. DB_PASSWORD

**Description**: The password for your MySQL database.

**Security considerations**:
- Use a strong, randomly generated password
- Never commit this to your repository
- Rotate regularly

**How to generate a secure password**:

```bash
# Generate a random 32-character password
openssl rand -base64 32
```

**How to add to GitHub**:
1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `DB_PASSWORD`
4. Value: Your database password
5. Click "Add secret"

### 5. HEALTH_CHECK_URL

**Description**: The URL endpoint to verify the application is running after deployment.

**Example values**:
- `http://localhost:3333/health`
- `https://api.yourdomain.com/health`
- `http://12.34.56.78:3333/health`

**Note**: You may need to implement a health check endpoint in your application if it doesn't exist yet.

**How to add to GitHub**:
1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `HEALTH_CHECK_URL`
4. Value: Your health check endpoint URL
5. Click "Add secret"

### 6. CODECOV_TOKEN (Optional)

**Description**: Token for uploading test coverage reports to Codecov.

**How to get**:
1. Sign up at https://codecov.io
2. Add your GitHub repository
3. Copy the upload token

**How to add to GitHub**:
1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Name: `CODECOV_TOKEN`
4. Value: Your Codecov upload token
5. Click "Add secret"

## Security Best Practices

### 1. Principle of Least Privilege

- Create a dedicated SSH key pair specifically for GitHub Actions
- Don't reuse personal SSH keys
- Consider creating a dedicated deployment user on EC2 with limited permissions

### 2. Key Rotation

- Rotate SSH keys periodically (every 90 days recommended)
- Update both GitHub secrets and EC2 authorized_keys when rotating

### 3. Access Control

- Limit who can view/edit repository secrets in GitHub
- Use GitHub's environment protection rules for production deployments
- Enable branch protection rules to prevent unauthorized deployments

### 4. Audit and Monitoring

- Review GitHub Actions logs regularly
- Monitor EC2 access logs for suspicious activity
- Set up CloudWatch alarms for unusual deployment patterns

### 5. Secret Management

- Never log secret values in GitHub Actions workflows
- Use GitHub's built-in secret masking
- Consider using AWS Secrets Manager for additional security layers

### 6. Network Security

- Configure EC2 Security Groups to allow SSH only from GitHub Actions IP ranges
- Use VPN or bastion hosts for additional security
- Enable AWS CloudTrail for audit logging

## Verification

After adding all secrets, verify they are configured correctly:

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. You should see all required secrets listed:
   - ✅ EC2_SSH_PRIVATE_KEY
   - ✅ EC2_HOST
   - ✅ EC2_USER
   - ✅ DB_PASSWORD
   - ✅ HEALTH_CHECK_URL
   - ✅ CODECOV_TOKEN (optional)

3. Test the deployment workflow:
   - Push a commit to the main branch
   - Monitor the Actions tab for workflow execution
   - Check for any authentication or connection errors

## Troubleshooting

### SSH Connection Failed

**Problem**: `Permission denied (publickey)`

**Solutions**:
- Verify the private key is correctly formatted in GitHub secrets
- Ensure the public key is in `~/.ssh/authorized_keys` on EC2
- Check EC2 Security Group allows SSH (port 22) from GitHub Actions IPs
- Verify the EC2_USER matches your instance's SSH username

### Health Check Failed

**Problem**: Health check returns non-200 status code

**Solutions**:
- Verify the HEALTH_CHECK_URL is correct
- Ensure the application is listening on the correct port
- Check EC2 Security Group allows HTTP/HTTPS traffic
- Verify the health endpoint is implemented in your application

### Database Connection Failed

**Problem**: Application can't connect to database

**Solutions**:
- Verify DB_PASSWORD is correct
- Check database host and port in .env file
- Ensure MySQL is running on EC2
- Verify database user has correct permissions

## Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitHub Encrypted Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AWS EC2 Key Pairs](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html)
- [SSH Key Generation](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/generating-a-new-ssh-key-and-adding-it-to-the-ssh-agent)
