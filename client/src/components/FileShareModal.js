import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./FileShareModal.css";

const FileShareModal = ({ setModalOpen, contract, fileIndex, fileName }) => {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [sharedAddresses, setSharedAddresses] = useState([]);
  const [activeTab, setActiveTab] = useState("share"); // "share" or "manage"

  useEffect(() => {
    // Fetch shared addresses when component mounts
    fetchSharedAddresses();
  }, []);

  const fetchSharedAddresses = async () => {
    if (!contract) return;
    
    try {
      setLoading(true);
      // First get the access list from the contract
      const accessList = await contract.shareAccess();
      console.log("Access list for sharing:", accessList);
      
      // Filter addresses that have access
      const addresses = accessList
        .filter(item => item.access)
        .map(item => ({
          address: item.user,
          displayAddress: `${item.user.slice(0, 8)}...${item.user.slice(-6)}`,
          hasAccess: item.access
        }));
      
      setSharedAddresses(addresses);
    } catch (error) {
      console.error("Error fetching shared addresses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddressChange = (e) => {
    setAddress(e.target.value);
  };

  const shareFile = async () => {
    if (!address || !ethers.utils.isAddress(address)) {
      alert("Please enter a valid Ethereum address");
      return;
    }
    
    if (fileIndex === null || fileIndex === undefined) {
      alert("File index is not valid. Please try again.");
      return;
    }
    
    // Get current user's address from the signer
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const signer = provider.getSigner();
      const currentUserAddress = await signer.getAddress();
      
      // Check if trying to share with own address
      if (address.toLowerCase() === currentUserAddress.toLowerCase()) {
        alert("You cannot share files with yourself");
        return;
      }
      
      setLoading(true);
      setStatus("Processing...");
      
      console.log(`Sharing file ${fileName} (index: ${fileIndex}) with ${address}`);
      
      // Check if the contract has the shareFile method for individual file sharing
      if (typeof contract.shareFile === 'function') {
        console.log(`Using shareFile method for file index ${fileIndex}`);
        const shareTx = await contract.shareFile(address, fileIndex);
        await shareTx.wait();
        console.log("File shared successfully");
      } else {
        // Fall back to global access if file-specific sharing is not available
        console.log("shareFile method not available, falling back to allow method");
        const tx = await contract.allow(address);
        await tx.wait();
      }
      
      // Refresh the shared addresses
      fetchSharedAddresses();
      
      setStatus("Success!");
      alert(`"${fileName}" has been shared with ${address}`);
      setAddress("");
      
      // Switch to manage tab
      setActiveTab("manage");
    } catch (error) {
      console.error("Error sharing file:", error);
      setStatus("Failed!");
      
      let errorMessage = "Failed to share file. ";
      
      if (error.message?.includes("invalid address")) {
        errorMessage += "Invalid Ethereum address format.";
      } else if (error.message?.includes("execution reverted")) {
        errorMessage += "Transaction was reverted by the contract.";
      } else if (error.message?.includes("cannot share with yourself")) {
        errorMessage = "You cannot share files with yourself.";
      } else {
        errorMessage += error.message || "Please try again.";
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const revokeAccess = async (addressToRevoke) => {
    if (!addressToRevoke || !ethers.utils.isAddress(addressToRevoke)) {
      alert("Invalid Ethereum address");
      return;
    }
    
    setLoading(true);
    setStatus("Revoking access...");
    
    try {
      // Check if contract has disallow method
      if (typeof contract.disallow !== 'function') {
        throw new Error("Contract doesn't have disallow method");
      }
      
      // Try specific file revocation first if the method exists
      if (typeof contract.revokeFileAccess === 'function') {
        try {
          console.log(`Revoking specific file access for file ${fileIndex} from ${addressToRevoke}`);
          const tx = await contract.revokeFileAccess(addressToRevoke, fileIndex);
          await tx.wait();
          console.log("File-specific revocation successful");
        } catch (error) {
          console.error("Error with file-specific revocation:", error);
          // If file-specific revocation fails, try global access revocation
          console.log("Falling back to global access revocation");
          const tx = await contract.disallow(addressToRevoke);
          await tx.wait();
        }
      } else {
        // Fall back to global access revocation if file-specific isn't available
        console.log(`Revoking global access from ${addressToRevoke}`);
        const tx = await contract.disallow(addressToRevoke);
        await tx.wait();
      }
      
      // Refresh the list of shared addresses
      setTimeout(() => {
        fetchSharedAddresses();
      }, 1000);
      
      setStatus("Access revoked!");
      alert(`Access for ${addressToRevoke} has been revoked`);
    } catch (error) {
      console.error("Error revoking access:", error);
      setStatus("Failed to revoke access!");
      
      // Provide more specific error message
      let errorMessage = "Unknown error";
      if (error.message?.includes("execution reverted")) {
        errorMessage = "Transaction was reverted by the contract";
      } else if (error.message?.includes("user rejected")) {
        errorMessage = "Transaction was rejected by the user";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(`Failed to revoke access: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="modalBackground">
      <div className="modalContainer">
        <div className="titleCloseBtn">
          <button onClick={() => setModalOpen(false)}>×</button>
        </div>
        
        <div className="title">Manage File Sharing</div>
        
        <div className="tab-container">
          <div className="tabs">
            <button 
              className={`tab-btn ${activeTab === 'share' ? 'active' : ''}`}
              onClick={() => setActiveTab('share')}
            >
              Share File
            </button>
            <button 
              className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              Manage Access
            </button>
          </div>
        </div>
        
        {activeTab === 'share' && (
          <div className="body">
            <p>Share "{fileName}" with another user</p>
            <input
              type="text"
              className="address-input"
              placeholder="Enter Ethereum Address (0x...)"
              value={address}
              onChange={handleAddressChange}
            />
            
            {status && (
              <div className={`status-message ${status === "Failed!" ? "error" : ""}`}>
                {status}
              </div>
            )}
            
            <div className="footer">
              <button
                onClick={() => setModalOpen(false)}
                id="cancelBtn"
              >
                Cancel
              </button>
              <button 
                onClick={shareFile} 
                disabled={loading || !address}
              >
                {loading ? "Processing..." : "Share File"}
              </button>
            </div>
          </div>
        )}
        
        {activeTab === 'manage' && (
          <div className="body">
            <p>Manage access for "{fileName}"</p>
            
            {loading && !sharedAddresses.length ? (
              <div className="loading-addresses">
                <div className="loading-spinner" style={{ width: '30px', height: '30px' }}></div>
                <p>Loading shared addresses...</p>
              </div>
            ) : sharedAddresses.length > 0 ? (
              <div className="shared-addresses-list">
                {sharedAddresses.map((item, idx) => (
                  <div key={idx} className="shared-address-item">
                    <span className="shared-address" title={item.address}>
                      {item.displayAddress}
                    </span>
                    <button 
                      className="revoke-btn"
                      onClick={() => revokeAccess(item.address)}
                      disabled={loading}
                    >
                      Revoke
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="no-shared-addresses">
                <p>This file has not been shared with anyone yet.</p>
              </div>
            )}
            
            {status && (
              <div className={`status-message ${status.includes("Failed") ? "error" : ""}`}>
                {status}
              </div>
            )}
            
            <div className="footer">
              <button
                onClick={() => setModalOpen(false)}
                id="doneBtn"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileShareModal;
