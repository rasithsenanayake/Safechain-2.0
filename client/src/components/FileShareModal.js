import { useState } from "react";
import { ethers } from "ethers";
import "./FileShareModal.css";

const FileShareModal = ({ setModalOpen, contract, fileIndex, fileName }) => {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAddressChange = (e) => {
    setAddress(e.target.value);
  };

  const shareFile = async () => {
    if (!address || !ethers.utils.isAddress(address)) {
      alert("Please enter a valid Ethereum address");
      return;
    }
    
    setLoading(true);
    
    try {
      const tx = await contract.shareFile(address, fileIndex);
      await tx.wait();
      alert(`"${fileName}" has been shared with ${address}`);
      setModalOpen(false);
    } catch (error) {
      console.error("Error sharing file:", error);
      alert("Failed to share file. Please try again.");
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
          <p>Share "{fileName}" with a specific user</p>
          <input
            type="text"
            className="address-input"
            placeholder="Enter Ethereum Address (0x...)"
            value={address}
            onChange={handleAddressChange}
          />
        </div>
        
        <div className="footer">
          <button
            onClick={() => setModalOpen(false)}
            id="cancelBtn"
          >
            Cancel
          </button>
          <button onClick={shareFile} disabled={loading}>
            {loading ? "Processing..." : "Share File"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileShareModal;
