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
      // This is just a placeholder. Your contract may have a different method to get shared addresses
      if (typeof contract.getSharedAddresses === 'function') {
        const addresses = await contract.getSharedAddresses(fileIndex);
        setSharedAddresses(addresses);
      } else {
        console.log("Contract doesn't have getSharedAddresses method");
      }
    } catch (error) {
      console.error("Error fetching shared addresses:", error);
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
    
    setLoading(true);
    setStatus("Processing...");
    
    try {
      console.log(`Sharing file ${fileName} (index: ${fileIndex}) with ${address}`);
      
      // First, verify if contract has allow method
      if (typeof contract.allow !== 'function') {
        throw new Error("Contract doesn't have allow method");
      }
      
      // Grant general access to the address
      setStatus("Granting access...");
      console.log("Calling allow method with address:", address);
      const allowTx = await contract.allow(address);
      await allowTx.wait();
      console.log("Access granted successfully");
      
      // The allow method will usually share all files in the basic implementation
      // If a shareFile method exists, call it for the specific file
      setStatus("Sharing file...");
      if (typeof contract.shareFile === 'function') {
        const shareTx = await contract.shareFile(address, fileIndex);
        await shareTx.wait();
        console.log("File shared using shareFile method");
      } else {
        console.log("No specific shareFile method, relying on allow method");
      }
      
      // Refresh the list of shared addresses
      fetchSharedAddresses();
      
      setStatus("Success!");
      alert(`"${fileName}" has been shared with ${address}`);
      setAddress("");
    } catch (error) {
      console.error("Error sharing file:", error);
      setStatus("Failed!");
      
      let errorMessage = "Failed to share file. ";
      
      if (error.message.includes("invalid address")) {
        errorMessage += "Invalid Ethereum address format.";
      } else if (error.message.includes("execution reverted")) {
        errorMessage += "Transaction was reverted by the contract.";
      } else if (error.message.includes("gas")) {
        errorMessage += "Transaction failed due to gas estimation. Try again.";
      } else if (error.message.includes("method")) {
        errorMessage += "Contract doesn't support this operation.";
      } else {
        errorMessage += "Please try again.";
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
      
      const tx = await contract.disallow(addressToRevoke);
      await tx.wait();
      
      // Refresh the list of shared addresses
      fetchSharedAddresses();
      
      setStatus("Access revoked!");
      alert(`Access for ${addressToRevoke} has been revoked`);
    } catch (error) {
      console.error("Error revoking access:", error);
      setStatus("Failed to revoke access!");
      alert(`Failed to revoke access: ${error.message}`);
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
            <p>Share "{fileName}" with a specific user</p>
            <p className="file-info">File Index: {fileIndex}</p>
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
            
            {sharedAddresses.length > 0 ? (
              <div className="shared-addresses-list">
                {sharedAddresses.map((addr, idx) => (
                  <div key={idx} className="shared-address-item">
                    <span className="shared-address" title={addr}>
                      {addr.slice(0, 8)}...{addr.slice(-6)}
                    </span>
                    <button 
                      className="revoke-btn"
                      onClick={() => revokeAccess(addr)}
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
