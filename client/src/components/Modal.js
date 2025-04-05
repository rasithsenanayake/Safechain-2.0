import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./Modal.css";

const Modal = ({ setModalOpen, contract }) => {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [accessList, setAccessList] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [fileSharing, setFileSharing] = useState([]);
  
  useEffect(() => {
    const fetchAccessData = async () => {
      if (!contract) return;
      
      try {
        setLoading(true);
        
        // Fetch general access list
        const rawList = await contract.shareAccess();
        const formattedList = rawList.map(item => ({
          address: item.user,
          hasAccess: item.access,
          displayAddress: `${item.user.substring(0, 6)}...${item.user.substring(item.user.length - 4)}`,
        }));
        setAccessList(formattedList);
        
        // Fetch file sharing information
        // This will need to be implemented in the smart contract
        try {
          const fileSharingData = await contract.getFileSharingData();
          setFileSharing(fileSharingData);
        } catch (error) {
          console.error("Error fetching file sharing data (may not be implemented yet):", error);
        }
      } catch (error) {
        console.error("Error loading access data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAccessData();
  }, [contract]);

  const handleAddressChange = (e) => {
    setAddress(e.target.value);
  };
  
  const handleSelectChange = (e) => {
    setSelectedAddress(e.target.value);
  };

  const sharing = async () => {
    if (!address || !ethers.utils.isAddress(address)) {
      alert("Please enter a valid Ethereum address");
      return;
    }
    
    setLoading(true);
    setStatus("Processing...");
    
    try {
      const tx = await contract.allow(address);
      await tx.wait();
      
      setStatus("Success!");
      alert("Access granted successfully!");
      
      // Refresh the access list
      const rawList = await contract.shareAccess();
      const formattedList = rawList.map(item => ({
        address: item.user,
        hasAccess: item.access,
        displayAddress: `${item.user.substring(0, 6)}...${item.user.substring(item.user.length - 4)}`,
      }));
      setAccessList(formattedList);
      
      setAddress("");
    } catch (error) {
      console.error("Error sharing access:", error);
      setStatus("Failed!");
      alert("Failed to grant access. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  const revokeAccess = async () => {
    if (!selectedAddress) {
      alert("Please select an address to revoke access");
      return;
    }
    
    setLoading(true);
    setStatus("Revoking access...");
    
    try {
      const tx = await contract.disallow(selectedAddress);
      await tx.wait();
      
      setStatus("Access revoked!");
      alert("Access revoked successfully!");
      
      // Refresh the access list
      const rawList = await contract.shareAccess();
      const formattedList = rawList.map(item => ({
        address: item.user,
        hasAccess: item.access,
        displayAddress: `${item.user.substring(0, 6)}...${item.user.substring(item.user.length - 4)}`,
      }));
      setAccessList(formattedList);
      
      setSelectedAddress("");
    } catch (error) {
      console.error("Error revoking access:", error);
      setStatus("Failed to revoke access!");
      alert("Failed to revoke access. Please try again.");
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
        
        <div className="title">Share & Manage Access</div>
        
        <div className="body">
          <div className="info-section">
            <p className="access-info">
              <strong>Important:</strong>
              <br />
              <strong>General Access</strong> only allows users to connect to your account.
              <br />
              <strong>It does NOT automatically share any files.</strong>
              <br />
              To share specific files, use the "Share" option on each individual file.
            </p>
          </div>
          
          <div className="share-section">
            <h3>Grant General Access</h3>
            <p>Enter the wallet address to grant connection access to your account</p>
            <input
              type="text"
              className="address-input"
              placeholder="Enter Ethereum Address (0x...)"
              value={address}
              onChange={handleAddressChange}
            />
            <button 
              className="action-button grant-button"
              onClick={sharing} 
              disabled={loading}
            >
              {loading ? "Processing..." : "Grant General Access"}
            </button>
          </div>
          
          <div className="revoke-section">
            <h3>Manage General Access</h3>
            {accessList.length > 0 ? (
              <>
                <p>Select an address to manage access:</p>
                <div className="access-list">
                  <select 
                    value={selectedAddress} 
                    onChange={handleSelectChange}
                    className="address-select"
                  >
                    <option value="">Select an address</option>
                    {accessList.map((item, index) => (
                      <option 
                        key={index} 
                        value={item.address}
                        className={item.hasAccess ? "has-access" : "no-access"}
                      >
                        {item.displayAddress} {item.hasAccess ? "(Active)" : "(Inactive)"}
                      </option>
                    ))}
                  </select>
                  
                  {selectedAddress && (
                    <button 
                      className="action-button revoke-button"
                      onClick={revokeAccess}
                      disabled={loading}
                    >
                      {loading ? "Processing..." : "Revoke General Access"}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <p className="no-access-message">
                {loading ? "Loading access list..." : "No addresses have been granted access yet"}
              </p>
            )}
          </div>
        </div>
        
        {status && (
          <div className={`status-message ${status.includes("Failed") ? "error" : ""}`}>
            {status}
          </div>
        )}
        
        <div className="footer">
          <button
            onClick={() => setModalOpen(false)}
            id="closeBtn"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
