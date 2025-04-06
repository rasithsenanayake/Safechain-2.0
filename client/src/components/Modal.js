import { useEffect, useState } from "react";
import { ethers } from "ethers";
import "./Modal.css";

const Modal = ({ setModalOpen, contract }) => {
  const [addressList, setAddressList] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // Share access with a new address
  const sharing = async () => {
    const address = document.querySelector(".address-input").value;
    if (!address || !ethers.utils.isAddress(address)) {
      alert("Please enter a valid Ethereum address");
      return;
    }
    
    setLoading(true);
    setStatus("Granting access...");
    
    try {
      // This grants access to all files
      const tx = await contract.allow(address);
      await tx.wait();
      setStatus("Access granted!");
      
      // Refresh the access list
      await loadAccessList();
      
      // Clear the input field
      document.querySelector(".address-input").value = "";
      
      alert("Access granted successfully!");
    } catch (error) {
      console.error("Error sharing access:", error);
      setStatus("Failed to grant access");
      alert("Failed to grant access. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Revoke access from a selected address
  const revokeAccess = async () => {
    if (!selectedAddress || !ethers.utils.isAddress(selectedAddress)) {
      alert("Please select a valid address to revoke access");
      return;
    }
    
    setLoading(true);
    setStatus("Revoking access...");
    
    try {
      // This revokes all access
      const tx = await contract.disallow(selectedAddress);
      await tx.wait();
      setStatus("Access revoked!");
      
      // Refresh the access list
      await loadAccessList();
      
      alert(`Access revoked from ${selectedAddress}`);
      setSelectedAddress("");
    } catch (error) {
      console.error("Error revoking access:", error);
      setStatus("Failed to revoke access");
      alert("Failed to revoke access. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Load the list of addresses that have access
  const loadAccessList = async () => {
    if (!contract) return;
    
    try {
      const addresses = await contract.shareAccess();
      setAddressList(addresses);
      
      // Update the select element
      let select = document.querySelector("#selectNumber");
      
      // Clear previous options
      while (select.options.length > 1) {
        select.remove(1);
      }
      
      // Add new options
      for (let i = 0; i < addresses.length; i++) {
        let opt = addresses[i];
        let e1 = document.createElement("option");
        e1.textContent = opt;
        e1.value = opt;
        select.appendChild(e1);
      }
    } catch (error) {
      console.error("Error loading access list:", error);
    }
  };
  
  // Handle address selection from dropdown
  const handleSelectChange = (e) => {
    setSelectedAddress(e.target.value);
  };
  
  useEffect(() => {
    if (contract) {
      loadAccessList();
    }
  }, [contract]);
  
  return (
    <div className="modalBackground">
      <div className="modalContainer">
        <div className="titleCloseBtn">
          <button onClick={() => setModalOpen(false)}>×</button>
        </div>
        
        <div className="title">Manage File Sharing</div>
        
        <div className="body">
          <p>Enter a wallet address to grant access to all your files</p>
          <input
            type="text"
            className="address-input"
            placeholder="Enter Ethereum Address (0x...)"
          />
        </div>
        
        {status && (
          <div className={`status-message ${status.includes("Failed") ? "error" : ""}`}>
            {status}
          </div>
        )}
        
        <div className="access-list">
          <label htmlFor="selectNumber">People with access:</label>
          <select 
            id="selectNumber" 
            value={selectedAddress}
            onChange={handleSelectChange}
          >
            <option value="">Select an address</option>
            {addressList.map((address, index) => (
              <option key={index} value={address}>
                {address}
              </option>
            ))}
          </select>
          
          {selectedAddress && (
            <button 
              className="revoke-btn" 
              onClick={revokeAccess}
              disabled={loading}
            >
              {loading ? "Processing..." : "Revoke Access"}
            </button>
          )}
        </div>
        
        <div className="footer">
          <button
            onClick={() => setModalOpen(false)}
            id="cancelBtn"
          >
            Close
          </button>
          <button 
            onClick={sharing}
            disabled={loading}
          >
            {loading ? "Processing..." : "Share All Files"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
