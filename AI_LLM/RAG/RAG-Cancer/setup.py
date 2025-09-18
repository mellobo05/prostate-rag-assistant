#!/usr/bin/env python3
"""
Setup script for Prostate Cancer RAG Assistant
"""

import os
import subprocess
import sys
from pathlib import Path

def create_directories():
    """Create necessary directories for the application."""
    directories = [
        "patient_data",
        "exports",
        "patient_data/documents"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"✅ Created directory: {directory}")

def install_requirements():
    """Install required Python packages."""
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        print("✅ Installed all required packages")
    except subprocess.CalledProcessError as e:
        print(f"❌ Error installing packages: {e}")
        return False
    return True

def create_env_file():
    """Create .env file template if it doesn't exist."""
    env_file = Path(".env")
    if not env_file.exists():
        with open(env_file, 'w') as f:
            f.write("# Prostate Cancer RAG Assistant Environment Variables\n")
            f.write("# Add your API keys here\n\n")
            f.write("GOOGLE_API_KEY=your_google_api_key_here\n")
            f.write("# OPENAI_API_KEY=your_openai_api_key_here  # Optional\n")
        print("✅ Created .env file template")
        print("⚠️  Please edit .env file and add your Google API key")
    else:
        print("✅ .env file already exists")

def main():
    """Main setup function."""
    print("🩺 Setting up Prostate Cancer RAG Assistant...")
    print("=" * 50)
    
    # Create directories
    create_directories()
    
    # Install requirements
    if not install_requirements():
        print("❌ Setup failed during package installation")
        return
    
    # Create .env file
    create_env_file()
    
    print("\n" + "=" * 50)
    print("🎉 Setup completed successfully!")
    print("\nNext steps:")
    print("1. Edit .env file and add your Google API key")
    print("2. Run the application: streamlit run app.py")
    print("3. Open your browser to the provided URL")
    print("\nFor more information, see README.md")

if __name__ == "__main__":
    main()
