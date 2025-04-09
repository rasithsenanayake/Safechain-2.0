import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./Modal.css";

const Modal = ({ setModalOpen, contract }) => {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [accessList, setAccessList] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  
  useEffect(() => {
    const fetchAccessData = async () => {
      if (!contract) return;
      
      try {
        setLoading(true);
        console.log("Fetching access list from contract");
        
        // Check if the contract has the shareAccess method
        if (typeof contract.shareAccess !== 'function') {
          console.error("Contract does not have shareAccess method");
          setStatus("Contract does not support access lists");
          setLoading(false);
          return;
        }
        
        // Fetch general access list
        const rawList = await contract.shareAccess();
        console.log("Raw access list:", rawList);
        
        // Format the list based on the actual structure returned by the contract
        let formattedList = [];
        
        if (Array.isArray(rawList)) {
          // If it's a simple array of addresses
          formattedList = rawList.map(item => {
            // Handle different return formats
            const address = typeof item === 'object' && item.user ? item.user : item;
            const hasAccess = typeof item === 'object' ? item.access : true;
            
            return {
              address,
              hasAccess,
              displayAddress: `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
            };
          });
        }
        
        console.log("Formatted access list:", formattedList);
        setAccessList(formattedList);
      } catch (error) {
        console.error("Error loading access data:", error);
        setStatus("Failed to load access list");
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
      console.log("Granting access to:", address);
      
      // Verify if the contract has the allow method
      if (typeof contract.allow !== 'function') {
        throw new Error("Contract doesn't have allow method");
      }
      
      const tx = await contract.allow(address);
      await tx.wait();
      console.log("Access grant transaction completed");
      
      setStatus("Success!");
      alert("Access granted successfully!");
      
      // Refresh the access list
      if (typeof contract.shareAccess === 'function') {
        const rawList = await contract.shareAccess();
        console.log("Updated access list:", rawList);
        
        const formattedList = rawList.map(item => {
          const address = typeof item === 'object' && item.user ? item.user : item;
          const hasAccess = typeof item === 'object' ? item.access : true;
          
          return {
            address,
            hasAccess,
            displayAddress: `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
          };
        });
        
        setAccessList(formattedList);
      }
      
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
      console.log("Revoking access from:", selectedAddress);
      
      // Verify if the contract has the disallow method
      if (typeof contract.disallow !== 'function') {
        throw new Error("Contract doesn't have disallow method");
      }
      
      const tx = await contract.disallow(selectedAddress);
      await tx.wait();
      console.log("Access revoke transaction completed");
      
      setStatus("Access revoked!");
      alert("Access revoked successfully!");
      
      // Refresh the access list
      if (typeof contract.shareAccess === 'function') {
        const rawList = await contract.shareAccess();
        
        const formattedList = rawList.map(item => {
          const address = typeof item === 'object' && item.user ? item.user : item;
          const hasAccess = typeof item === 'object' ? item.access : true;
          
          return {
            address,
            hasAccess,
            displayAddress: `${address.substring(0, 6)}...${address.substring(address.length - 4)}`
          };
        });
        
        setAccessList(formattedList);
      }
      
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
              <strong>Important:</strong> Sharing access will allow the user to view your files.
            </p>
          </div>
          
          <div className="share-section">
            <h3>Grant File Access</h3>
            <p>Enter the wallet address to grant access to your files</p>
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
              {loading ? "Processing..." : "Grant Access"}
            </button>
          </div>
          
          <div className="revoke-section">
            <h3>Manage Access</h3>
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
                      {loading ? "Processing..." : "Revoke Access"}
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
