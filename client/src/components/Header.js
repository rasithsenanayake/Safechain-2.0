import React from "react";
import "./Header.css";

const Header = ({ account, connectWallet, changeAccount, disconnectWallet, setModalOpen }) => {
  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  return (
    <header className="header">
      <div className="logo">
        <h1>SAFECHAIN</h1>
      </div>
      
      <div className="header-right">
        {account ? (
          <>
            <div className="action-buttons">
              <span className="account-address" title={account}>
                {formatAddress(account)}
              </span>
              <button 
                className="change-account-btn" 
                onClick={changeAccount}
              >
                Change
              </button>
              <button 
                className="share-btn" 
                onClick={() => setModalOpen(true)}
              >
                Manage Access
              </button>
              <button 
                className="disconnect-btn" 
                onClick={disconnectWallet}
              >
                Disconnect
              </button>
            </div>
          </>
        ) : (
          <button className="connect-btn" onClick={connectWallet}>
            Connect Wallet
          </button>
        )}
      </div>
    </header>
  );
};

export default Header;
