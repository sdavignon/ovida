#!/bin/bash

# Deployment Setup Verification Script
# This script helps verify your DreamHost deployment configuration

echo "🔧 Ovida Deployment Setup Verification"
echo "======================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SSH_HOST="vps66687.dreamhostps.com"
SSH_USER="dh_rt2c39"
SSH_PORT="22"

echo -e "${YELLOW}📋 Checking deployment prerequisites...${NC}"

# Check if SSH is available
if ! command -v ssh &> /dev/null; then
    echo -e "${RED}❌ SSH client not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ SSH client available${NC}"

# Test SSH connection
echo -e "${YELLOW}🔐 Testing SSH connection to $SSH_HOST...${NC}"
echo "You will be prompted for the password: \$t3FjqpSzKM&%H@ZrZ7fpRaj_"

if ssh -o ConnectTimeout=10 -o BatchMode=no -p $SSH_PORT $SSH_USER@$SSH_HOST "echo 'SSH connection successful'" 2>/dev/null; then
    echo -e "${GREEN}✅ SSH connection successful${NC}"
else
    echo -e "${RED}❌ SSH connection failed${NC}"
    echo "Please verify:"
    echo "  - Server is accessible: $SSH_HOST"
    echo "  - Username is correct: $SSH_USER"
    echo "  - Password is correct"
    echo "  - SSH is enabled on the server"
    exit 1
fi

# Check and suggest deployment paths
echo -e "${YELLOW}📁 Checking possible deployment paths...${NC}"

ssh -p $SSH_PORT $SSH_USER@$SSH_HOST << 'EOF'
echo "Current working directory:"
pwd

echo -e "\nHome directory contents:"
ls -la ~/

echo -e "\nLooking for web directories:"
find ~ -maxdepth 2 -type d -name "*ovida*" -o -name "public_html" -o -name "*.cloud" 2>/dev/null | head -10

echo -e "\nSuggested REMOTE_PATH values:"
echo "For subdomain: /home/dh_rt2c39/ovida.1976.cloud/"
echo "For main domain: /home/dh_rt2c39/public_html/"

# Check if ovida.1976.cloud directory exists
if [ -d "/home/dh_rt2c39/ovida.1976.cloud" ]; then
    echo -e "\n✅ /home/dh_rt2c39/ovida.1976.cloud/ exists"
    echo "Recommended REMOTE_PATH: /home/dh_rt2c39/ovida.1976.cloud/"
elif [ -d "/home/dh_rt2c39/public_html" ]; then
    echo -e "\n✅ /home/dh_rt2c39/public_html/ exists"
    echo "Recommended REMOTE_PATH: /home/dh_rt2c39/public_html/"
else
    echo -e "\n⚠️  Standard web directories not found"
    echo "You may need to create the directory or check with DreamHost"
fi
EOF

echo -e "${YELLOW}📝 Next Steps:${NC}"
echo "1. Copy the recommended REMOTE_PATH from above"
echo "2. Go to GitHub repository → Settings → Secrets and variables → Actions"
echo "3. Add the repository secrets and variables as documented in DEPLOYMENT.md"
echo "4. Test the deployment by pushing to main branch"

echo -e "${GREEN}🎉 Verification complete!${NC}"