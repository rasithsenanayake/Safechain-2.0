import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./FileShareModal.css";

const FileShareModal = ({ setModalOpen, contract, fileIndex, fileName }) => {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [sharedWith, setSharedWith] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");

  useEffect(() => {
    // Fetch users who have access to this specific file
    const fetchFileSharedUsers = async () => {
      if (!contract || fileIndex === null || fileIndex === undefined) return;
      
      try {
        setLoading(true);
        const users = await contract.getFileSharedUsers(fileIndex);
        
        // Format addresses for display
        const formattedUsers = users.map(user => ({
          address: user,
          displayAddress: `${user.substring(0, 6)}...${user.substring(user.length - 4)}`
        }));
        
        setSharedWith(formattedUsers);
      } catch (error) {
        console.error("Error fetching shared users for file:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFileSharedUsers();
  }, [contract, fileIndex]);

  const handleAddressChange = (e) => {
    setAddress(e.target.value);
  };

  const handleSelectChange = (e) => {
    setSelectedAddress(e.target.value);
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
    
    // Check if the user already has access to this file
    const currentSharedUsers = sharedWith.map(user => user.address);
    if (currentSharedUsers.includes(address)) {
      alert(`${address} already has access to this file.`);
      return;
    }
    
    setLoading(true);
    setStatus("Processing...");
    
    try {
      // First, grant general access to make sure they can connect
      // This step ensures the user is added to the access list
      setStatus("Granting basic access...");
      const allowTx = await contract.allow(address);
      await allowTx.wait();
      
      // Then, specifically share the individual file
      setStatus("Sharing file...");
      const tx = await contract.shareFile(address, fileIndex);
      await tx.wait();
      
      // Update the shared users list
      const users = await contract.getFileSharedUsers(fileIndex);
      const formattedUsers = users.map(user => ({
        address: user,
        displayAddress: `${user.substring(0, 6)}...${user.substring(user.length - 4)}`
      }));
      
      setSharedWith(formattedUsers);
      setStatus("Success!");
      alert(`"${fileName}" has been shared with ${address}`);
      setAddress(""); // Clear the input field
    } catch (error) {
      console.error("Error sharing file:", error);
      setStatus("Failed!");
      
      // More detailed error message
      let errorMessage = "Failed to share file. ";
      
      if (error.message.includes("invalid BigNumber")) {
        errorMessage += "Invalid file index. This may be a data formatting issue.";
      } else if (error.message.includes("Invalid index")) {
        errorMessage += "Invalid file index. The file may have been deleted or moved.";
      } else if (error.message.includes("gas")) {
        errorMessage += "Transaction failed due to gas estimation. Try again.";
      } else {
        errorMessage += "Please try again. Error: " + error.message;
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  
  const revokeFileAccess = async () => {
    if (!selectedAddress || !ethers.utils.isAddress(selectedAddress)) {
      alert("Please select a valid address");
      return;
    }
    
    if (fileIndex === null || fileIndex === undefined) {
      alert("File index is not valid. Please try again.");
      return;
    }
    
    setLoading(true);
    setStatus("Revoking file access...");
    
    try {
      const tx = await contract.revokeFileAccess(selectedAddress, fileIndex);
      await tx.wait();
      
      setStatus("Access revoked!");
      
      // Refresh the shared users list
      const users = await contract.getFileSharedUsers(fileIndex);
      const formattedUsers = users.map(user => ({
        address: user,
        displayAddress: `${user.substring(0, 6)}...${user.substring(user.length - 4)}`
      }));
      
      setSharedWith(formattedUsers);
      setSelectedAddress("");
      
      alert(`File access for "${fileName}" has been revoked from ${selectedAddress}`);
    } catch (error) {
      console.error("Error revoking file access:", error);
      setStatus("Failed!");
      alert("Failed to revoke file access. Please try again.");
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
        
        <div className="title">Share File</div>
        
        <div className="body">
          <h3>Share "{fileName}" with a user</h3>
          <input
            type="text"
            className="address-input"
            placeholder="Enter Ethereum Address (0x...)"
            value={address}
            onChange={handleAddressChange}
          />
          <button 
            className="action-button"
            onClick={shareFile} 
            disabled={loading}
          >
            {loading ? "Processing..." : "Share File"}
          </button>
          
          <div className="manage-sharing-section">
            <h3>Manage File Sharing</h3>
            {sharedWith.length > 0 ? (
              <>
                <p>Revoke access to this file:</p>
                <div className="shared-users-list">
                  <select 
                    value={selectedAddress} 
                    onChange={handleSelectChange}
                    className="address-select"
                  >
                    <option value="">Select an address</option>
                    {sharedWith.map((user, index) => (
                      <option 
                        key={index} 
                        value={user.address}
                      >
                        {user.displayAddress}
                      </option>
                    ))}
                  </select>
                  
                  {selectedAddress && (
                    <button 
                      className="action-button revoke-button"
                      onClick={revokeFileAccess}
                      disabled={loading}
                    >
                      {loading ? "Processing..." : "Revoke File Access"}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="no-sharing-message">
                {loading ? "Loading..." : "This file hasn't been shared with anyone yet"}
              </p>
            )}
          </div>
        </div>
        
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
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileShareModal;
