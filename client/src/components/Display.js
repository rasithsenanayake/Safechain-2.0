import { useState, useEffect } from "react";
import FileShareModal from "./FileShareModal";
import "./Display.css";

const Display = ({ contract, account, activeTab, refreshTrigger }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileShareModalOpen, setFileShareModalOpen] = useState(false);
  const [fileToShare, setFileToShare] = useState({ index: null, name: "" });

  // Automatically fetch files when component mounts, account changes, 
  // files are uploaded, or tab is switched
  useEffect(() => {
    if (contract && account) {
      fetchFiles();
    }
  }, [contract, account, refreshTrigger, activeTab]);

  const fetchFiles = async () => {
    if (!contract || !account) {
      return;
    }

    setLoading(true);
    setSelectedFiles([]);

    try {
      let dataArray;
      
      if (activeTab === "myFiles") {
        // Fetch user's own files
        dataArray = await contract.display(account);
      } else {
        // For shared files tab, we need to fetch from other accounts
        // This is a placeholder - we need to implement shared files view
        const accessList = await contract.shareAccess();
        
        // Create an array to hold all shared files
        let sharedFiles = [];
        
        // For each account that has shared with the current user
        for (let i = 0; i < accessList.length; i++) {
          if (accessList[i].access) {
            try {
              // Attempt to get files from each account that has shared access
              const ownerAddress = accessList[i].user;
              const filesFromOwner = await contract.display(ownerAddress);
              
              // Add owner information to each file
              const filesWithOwner = filesFromOwner.map(file => {
                return `${file}||OWNER:${ownerAddress}`;
              });
              
              sharedFiles = [...sharedFiles, ...filesWithOwner];
            } catch (err) {
              console.error("Error fetching shared files:", err);
            }
          }
        }
        dataArray = sharedFiles;
      }

      setData(dataArray || []);
    } catch (e) {
      console.error("Error fetching data:", e);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const removeFile = async (index) => {
    if (!contract) {
      alert("Please connect your wallet");
      return;
    }

    try {
      if (index < 0 || index >= data.length) {
        alert("Invalid file index");
        return;
      }

      const tx = await contract.removeFile(index);
      await tx.wait();
      alert("File removed successfully!");
      fetchFiles(); // Refresh the file list
    } catch (e) {
      console.error("Error removing file:", e);
      alert(`Failed to remove file. Error: ${e.message}`);
    }
  };

  const removeSelectedFiles = async () => {
    if (!contract) {
      alert("Please connect your wallet");
      return;
    }

    if (selectedFiles.length === 0) {
      alert("No files selected for deletion");
      return;
    }

    try {
      // Ensure all indices are valid
      const validIndices = selectedFiles.filter((index) => index >= 0 && index < data.length);
      if (validIndices.length === 0) {
        alert("No valid files selected for deletion");
        return;
      }

      const tx = await contract.removeFiles(validIndices);
      await tx.wait();
      alert("Selected files removed successfully!");
      setSelectedFiles([]);
      fetchFiles(); // Refresh the file list
    } catch (e) {
      console.error("Error removing files:", e);
      alert(`Failed to remove selected files. Error: ${e.message}`);
    }
  };

  const downloadFile = (url, fileName) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
  };

  const toggleFileSelection = (index) => {
    if (selectedFiles.includes(index)) {
      setSelectedFiles(selectedFiles.filter((i) => i !== index));
    } else {
      setSelectedFiles([...selectedFiles, index]);
    }
  };

  const openShareModal = (index, fileName) => {
    setFileToShare({ index, name: fileName });
    setFileShareModalOpen(true);
  };

  const parseFileInfo = (item) => {
    // Parse the file info string which may contain file URL, name, and owner info
    let ipfsUrl, fileName, owner = null;
    
    const parts = item.split("||");
    ipfsUrl = parts[0];
    
    if (parts.length > 1) {
      // Check if the second part contains owner information
      if (parts[1].startsWith("OWNER:")) {
        owner = parts[1].substring(6);
        fileName = parts.length > 2 ? parts[2] : `File`;
      } else {
        fileName = parts[1];
        // Check if there's an owner part
        if (parts.length > 2 && parts[2].startsWith("OWNER:")) {
          owner = parts[2].substring(6);
        }
      }
    } else {
      fileName = `File`;
    }
    
    const imageUrl = ipfsUrl.startsWith("ipfs://")
      ? `https://gateway.pinata.cloud/ipfs/${ipfsUrl.substring(7)}`
      : ipfsUrl;
      
    return { ipfsUrl, fileName, imageUrl, owner };
  };

  return (
    <div className="display-container">
      {activeTab === "myFiles" && (
        <div className="display-header">
          <h2 className="tab-title">My Files</h2>
          {selectedFiles.length > 0 && (
            <button className="delete-group-button" onClick={removeSelectedFiles}>
              Delete Selected Files
            </button>
          )}
        </div>
      )}
      
      {activeTab === "sharedFiles" && (
        <div className="display-header">
          <h2 className="tab-title">Files Shared With Me</h2>
        </div>
      )}

      {loading ? (
        <div className="loading-indicator">Loading files...</div>
      ) : data.length > 0 ? (
        <div className="image-list">
          {data.map((item, index) => {
            const { ipfsUrl, fileName, imageUrl, owner } = parseFileInfo(item);

            return (
              <div key={index} className="image-card">
                <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="image-item">
                  <img
                    src={imageUrl}
                    alt={fileName}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = "https://via.placeholder.com/250x150?text=File+Not+Found";
                    }}
                  />
                </a>
                <div className="image-info">
                  <div className="image-title" title={fileName}>
                    {fileName.length > 20 ? fileName.substring(0, 17) + "..." : fileName}
                  </div>
                  
                  {owner && (
                    <div className="file-owner">
                      Shared by: {owner.substring(0, 6)}...{owner.substring(owner.length - 4)}
                    </div>
                  )}
                  
                  <div className="image-actions">
                    {activeTab === "myFiles" && (
                      <>
                        <button className="delete-button" onClick={() => removeFile(index)}>
                          Delete
                        </button>
                        <button 
                          className="share-file-button"
                          onClick={() => openShareModal(index, fileName)}
                        >
                          Share
                        </button>
                      </>
                    )}
                    <button
                      className="download-button"
                      onClick={() => downloadFile(imageUrl, fileName)}
                    >
                      Download
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="no-files">
          <p>
            {activeTab === "myFiles" 
              ? "No files found. Upload new files to get started." 
              : "No files have been shared with you yet."}
          </p>
        </div>
      )}

      {fileShareModalOpen && (
        <FileShareModal
          setModalOpen={setFileShareModalOpen}
          contract={contract}
          fileIndex={fileToShare.index}
          fileName={fileToShare.name}
        />
      )}
    </div>
  );
};

export default Display;
