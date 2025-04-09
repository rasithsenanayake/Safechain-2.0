# SAFECHAIN - Decentralized File Storage System
Final Year Project - 2024

## Project Overview
SAFECHAIN is a decentralized file storage and sharing platform built on blockchain technology. This project aims to provide secure, transparent, and decentralized file management with granular access control features.

## Key Features
- Secure file upload to IPFS
- Blockchain-based access management
- Individual and global file sharing capabilities
- User-friendly interface
- Metamask integration for secure authentication
- Real-time file status updates
- Direct file download functionality

## Technologies Used
- **Frontend:** React.js
- **Smart Contract:** Solidity
- **Blockchain:** Ethereum (Hardhat)
- **Storage:** IPFS (Pinata)
- **Authentication:** MetaMask
- **Styling:** CSS3

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- MetaMask browser extension
- Git

### Installation Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/rasithsenanayake/Safechain-2.0.git
   cd SAFECHAIN\ 2.0
   ```

2. **Install dependencies**
   ```bash
   # Install root dependencies
   npm install

   # Install client dependencies
   cd client
   npm install
   ```

3. **Configure environment**
   - Create `.env` file in the root directory
   - Add your Pinata API keys:
     ```
     PINATA_API_KEY=your_api_key
     PINATA_SECRET_KEY=your_secret_key
     ```

4. **Start Hardhat node**
   ```bash
   # Open a new terminal in root directory
   npx hardhat node
   ```

5. **Deploy smart contract**
   ```bash
   # Open a new terminal in root directory
   npx hardhat run scripts/deploy.js --network localhost
   ```

6. **Start the application**
   ```bash
   # In the client directory
   npm start
   ```

7. **Connect MetaMask**
   - Connect MetaMask to localhost:8545
   - Import test accounts using private keys from Hardhat node

## Usage Instructions

1. **Connect Wallet**
   - Click "Connect Wallet" and approve MetaMask connection

2. **Upload Files**
   - Click "Choose File" to select a file
   - Click "Upload to SAFECHAIN" to store file

3. **Share Files**
   - Individual sharing: Click "Share" on any file
   - Global access: Use "Share Access" in header

4. **Access Shared Files**
   - Switch to "Shared Files" tab to view files shared with you
   - Download files using the download button

## Common Issues

1. **File Not Showing**
   - Verify contract address in App.js matches deployed contract
   - Check console for error messages
   - Ensure transaction is confirmed on blockchain

2. **Access Denied**
   - Verify you have been granted access by the file owner
   - Check if you're using the correct MetaMask account


