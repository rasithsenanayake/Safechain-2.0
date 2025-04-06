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
      // First check if the address is already in the access list
      const accessList = await contract.shareAccess();
      const hasAccess = accessList.some(
        addr => addr.toLowerCase() === address.toLowerCase()
      );
      
      if (!hasAccess) {
        // Grant access to the address if they don't already have it
        setStatus("Granting access...");
        console.log(`Adding ${address} to access list`);
        const allowTx = await contract.allow(address);
        await allowTx.wait();
        console.log("Access granted successfully");
      } else {
        console.log(`${address} already has access`);
      }
      
      // Get all uploaded files from the current account
      const myFiles = await contract.display(await contract.signer.getAddress());
      console.log("Current user's files:", myFiles);
      
      // Make sure the file index is valid
      if (fileIndex >= 0 && fileIndex < myFiles.length) {
        setStatus("Sharing file...");
        console.log(`Sharing file index ${fileIndex}: ${fileName} with ${address}`);
        
        // In this implementation, granting access gives access to all files
        // If your contract supports individual file sharing, you'd call that method here
        
        setStatus("Success!");
        alert(`"${fileName}" has been shared with ${address}`);
        setModalOpen(false);
      } else {
        throw new Error("Invalid file index");
      }
    } catch (error) {
      console.error("Error sharing file:", error);
      setStatus("Failed!");
      
      let errorMessage = "Failed to share file. ";
      
      if (error.message.includes("invalid address")) {
        errorMessage += "Invalid Ethereum address format.";
      } else if (error.message.includes("execution reverted")) {
        errorMessage += "Transaction was reverted by the contract.";
      } else if (error.message.includes("gas")) {
        errorMessage += "Gas estimation failed. Try again.";
      } else if (error.message.includes("Invalid file index")) {
        errorMessage += "File doesn't exist or index is invalid.";
      } else {
        errorMessage += "Please try again.";
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
          <p className="file-info">File Index: {fileIndex}</p>
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
          <button 
            onClick={shareFile} 
            disabled={loading || !address}
          >
            {loading ? "Processing..." : "Share File"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileShareModal;
