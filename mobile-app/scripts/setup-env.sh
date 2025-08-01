#!/bin/bash

# Myon Health Mobile App - Environment Setup Script
# This script helps set up environment variables for AWS configuration

set -e

echo "🔧 Setting up environment variables for Myon Health Mobile App..."

# Check if .env file already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists. Do you want to overwrite it? (y/n)"
    read -r response
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        echo "📝 Overwriting existing .env file..."
    else
        echo "❌ Setup cancelled. Existing .env file preserved."
        exit 0
    fi
fi

# Create .env file
cat > .env << EOF
# AWS Textract Configuration
# Replace these with your actual AWS credentials
AWS_ACCESS_KEY_ID=your_actual_access_key_id
AWS_SECRET_ACCESS_KEY=your_actual_secret_access_key
AWS_REGION=us-east-1

# API Configuration
# Replace with your backend API URL
API_BASE_URL=https://your-backend-api.com

# App Environment
APP_ENV=development
EOF

echo "✅ .env file created successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Edit the .env file with your actual AWS credentials"
echo "2. Update the API_BASE_URL with your backend URL"
echo "3. Run 'npm start' to test the configuration"
echo ""
echo "🔒 Security Note:"
echo "- Never commit .env files to version control"
echo "- Use different credentials for development and production"
echo "- Consider using AWS Cognito for production apps"
echo ""
echo "📖 For more information, see ENVIRONMENT_VARIABLES.md" 