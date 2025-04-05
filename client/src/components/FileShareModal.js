import { useState } from "react";
import { ethers } from "ethers";
import "./FileShareModal.css";

const FileShareModal = ({ setModalOpen, contract, fileIndex, fileName }) => {
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

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
      // First, grant general access to make sure they can connect
      // This step ensures the user is added to the access list
      setStatus("Granting basic access...");
      const allowTx = await contract.allow(address);
      await allowTx.wait();
      
      // Then, specifically share the individual file
      setStatus("Sharing file...");
      const tx = await contract.shareFile(address, fileIndex);
      await tx.wait();
      
      setStatus("Success!");
      alert(`"${fileName}" has been shared with ${address}`);
      setModalOpen(false);
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
          <button onClick={shareFile} disabled={loading}>
            {loading ? "Processing..." : "Share File"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileShareModal;
