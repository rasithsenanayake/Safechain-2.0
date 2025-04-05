import React, { useState, useEffect } from "react";
import "./Header.css";

const Header = ({ account, connectWallet, changeAccount, disconnectWallet, setModalOpen, provider }) => {
  const [accountName, setAccountName] = useState("My Account");

  // Only try to resolve ENS name when account changes
  useEffect(() => {
    const resolveAccountName = async () => {
      if (!account) return;
      
      try {
        // Skip ENS lookup on networks that don't support it
        if (provider) {
          const network = await provider.getNetwork();
          // Only try ENS lookup on mainnet or recognized test networks
          const ensEnabledNetworks = [1, 3, 4, 5, 42]; // mainnet, ropsten, rinkeby, goerli, kovan
          
          if (ensEnabledNetworks.includes(network.chainId)) {
            try {
              const name = await provider.lookupAddress(account);
              if (name) {
                setAccountName(name);
                return;
              }
            } catch (ensError) {
              console.log("ENS lookup not available:", ensError.message);
            }
          }
        }
        
        // Fallback to shortened account address
        setAccountName(formatAddress(account));
      } catch (error) {
        console.log("Error resolving account info:", error.message);
        setAccountName(formatAddress(account));
      }
    };
    
    resolveAccountName();
  }, [account, provider]);

  // Helper function to format address
  const formatAddress = (address) => {
    return address ? `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : "My Account";
  };

  return (
    <header className="app-header">
      <div className="header-container">
        <div className="logo">
          <h1>SAFECHAIN</h1>
        </div>
        <div className="header-actions">
          {account ? (
            <>
              <div className="account-info">
                <span className="account-name">{accountName}</span>
                <span className="account-address">
                  {formatAddress(account)}
                </span>
              </div>
              <button className="header-button change-account-btn" onClick={changeAccount}>
                Change Account
              </button>
              <button className="header-button share-btn" onClick={() => setModalOpen(true)}>
                Share Access
              </button>
              <button className="header-button logout-btn" onClick={disconnectWallet}>
                Logout
              </button>
            </>
          ) : (
            <button className="header-button login-btn" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
