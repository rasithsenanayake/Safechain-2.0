import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./Header.css";

const Header = ({ account, connectWallet, disconnectWallet, setModalOpen, provider }) => {
  const [network, setNetwork] = useState("");
  const [balance, setBalance] = useState("");

  useEffect(() => {
    const fetchNetworkInfo = async () => {
      if (provider) {
        try {
          const network = await provider.getNetwork();
          setNetwork(network.name !== "unknown" ? network.name : `Chain ID: ${network.chainId}`);
        } catch (error) {
          console.error("Error fetching network:", error);
          setNetwork("Unknown");
        }
      }
    };

    const fetchBalance = async () => {
      if (provider && account) {
        try {
          const balance = await provider.getBalance(account);
          const formattedBalance = parseFloat(
            ethers.utils.formatEther(balance)
          ).toFixed(4);
          setBalance(formattedBalance);
        } catch (error) {
          console.error("Error fetching balance:", error);
          setBalance("Error");
        }
      }
    };

    fetchNetworkInfo();
    fetchBalance();
  }, [provider, account]);

  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  return (
    <header className="header">
      <div className="logo">
        <h1>SAFECHAIN</h1>
      </div>
      
      <div className="header-right">
        {account ? (
          <>
            <div className="wallet-info">
              <span className="network">{network}</span>
              {balance && <span className="balance">{balance} ETH</span>}
              <span className="address">{formatAddress(account)}</span>
            </div>
            
            <div className="action-buttons">
              <button className="share-btn" onClick={() => setModalOpen(true)}>
                Share Access
              </button>
              <button className="disconnect-btn" onClick={disconnectWallet}>
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
