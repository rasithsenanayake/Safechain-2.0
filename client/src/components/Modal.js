import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./Modal.css";

const Modal = ({ setModalOpen, contract }) => {
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  
  const handleAddressChange = (e) => {
    setAddress(e.target.value);
  };

  const sharing = async () => {
    if (!address || !ethers.utils.isAddress(address)) {
      alert("Please enter a valid Ethereum address");
      return;
    }
    
    setLoading(true);
    setStatus("Processing...");
    
    try {
      await contract.allow(address);
      setStatus("Success!");
      setModalOpen(false);
      alert("Access granted successfully!");
    } catch (error) {
      console.error("Error sharing access:", error);
      setStatus("Failed!");
      alert("Failed to grant access. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    const accessList = async () => {
      if (!contract) return;
      
      try {
        const addressList = await contract.shareAccess();
        let select = document.querySelector("#selectNumber");
        
        // Clear previous options
        while (select.options.length > 1) {
          select.remove(1);
        }
        
        // Add new options
        for (let i = 0; i < addressList.length; i++) {
          let opt = addressList[i];
          let e1 = document.createElement("option");
          e1.textContent = opt;
          e1.value = opt;
          select.appendChild(e1);
        }
      } catch (error) {
        console.error("Error loading access list:", error);
      }
    };
    
    contract && accessList();
  }, [contract]);
  
  return (
    <div className="modalBackground">
      <div className="modalContainer">
        <div className="titleCloseBtn">
          <button onClick={() => setModalOpen(false)}>×</button>
        </div>
        
        <div className="title">Share Access</div>
        
        <div className="body">
          <p>Enter the wallet address to grant access to your files</p>
          <input
            type="text"
            className="address-input"
            placeholder="Enter Ethereum Address (0x...)"
            value={address}
            onChange={handleAddressChange}
          />
        </div>
        
        {status && (
          <div className={`status-message ${status === "Failed!" ? "error" : ""}`}>
            {status}
          </div>
        )}
        
        <div className="access-list">
          <label htmlFor="selectNumber">People with access:</label>
          <select id="selectNumber">
            <option value="">Select an address</option>
          </select>
        </div>
        
        <div className="footer">
          <button
            onClick={() => setModalOpen(false)}
            id="cancelBtn"
          >
            Cancel
          </button>
          <button onClick={sharing} disabled={loading}>
            {loading ? "Processing..." : "Share"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
