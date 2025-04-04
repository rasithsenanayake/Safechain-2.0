import React, { useState, useEffect } from "react";
import "./Header.css";

const Header = ({ account, connectWallet, disconnectWallet, setModalOpen, provider }) => {
  const [ensName, setEnsName] = useState(null);
  const [accountName, setAccountName] = useState("My Account");

  // Try to resolve ENS name when account changes
  useEffect(() => {
    const resolveEns = async () => {
      if (account && provider) {
        try {
          // Try to get wallet name from MetaMask
          if (window.ethereum && window.ethereum.request) {
            try {
              // First try to get ENS name
              const name = await provider.lookupAddress(account);
              if (name) {
                setEnsName(name);
                setAccountName(name);
              } else {
                // If no ENS name, try to get the user-defined account name from MetaMask
                // This is a non-standard approach that might work for MetaMask
                const accounts = await window.ethereum.request({ method: 'wallet_getPermissions' });
                const accountLabel = accounts[0]?.name || "Account";
                setAccountName(accountLabel);
              }
            } catch (err) {
              console.error("Error getting account name:", err);
              setAccountName("My Account");
            }
          }
        } catch (error) {
          console.error("Error resolving account info:", error);
          setEnsName(null);
          setAccountName("My Account");
        }
      }
    };
    
    resolveEns();
  }, [account, provider]);

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
                  {account.slice(0, 6)}...{account.slice(-4)}
                </span>
              </div>
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
