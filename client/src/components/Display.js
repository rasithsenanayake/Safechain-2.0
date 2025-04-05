import { useState, useEffect, useCallback } from "react";
import FileShareModal from "./FileShareModal";
import "./Display.css";

const Display = ({ contract, account, activeTab, refreshTrigger }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [fileShareModalOpen, setFileShareModalOpen] = useState(false);
  const [fileToShare, setFileToShare] = useState({ 
    index: null,
    name: "",
    originalIndex: null // Add this field to track the actual contract index
  });

  // Use useCallback for fetchFiles to avoid dependency warnings
  const fetchFiles = useCallback(async () => {
    if (!contract || !account) return;
    setLoading(true);
    
    try {
      let dataArray;
      
      if (activeTab === "myFiles") {
        try {
          // Try using the safer getUserFiles method first
          dataArray = await contract.getUserFiles(account);
        } catch (error) {
          // Fall back to display method if getUserFiles isn't available
          dataArray = await contract.display(account);
        }
      } else {
        // Shared files tab
        try {
          const accessList = await contract.shareAccess();
          let sharedFiles = [];

          // Optimize the shared files fetching logic
          for (const access of accessList) {
            const ownerAddress = access.user;
            
            if (ownerAddress === account) continue;

            try {
              // Check global access
              const hasGlobalAccess = await contract.hasGlobalAccess(ownerAddress, account);
              
              if (hasGlobalAccess) {
                try {
                  const ownerFiles = await contract.display(ownerAddress);
                  const filesWithOwner = ownerFiles.map(file => 
                    `${file}||OWNER:${ownerAddress}`
                  );
                  sharedFiles = [...sharedFiles, ...filesWithOwner];
                } catch (err) {
                  console.warn(`Error fetching global files from ${ownerAddress}`);
                }
              }
              
              // Get file count to avoid out-of-bounds errors
              let fileCount;
              try {
                fileCount = await contract.getFileCount(ownerAddress);
              } catch {
                fileCount = 20; // Fallback if getFileCount is unavailable
              }
              
              // Check individual files
              for (let i = 0; i < fileCount; i++) {
                try {
                  const hasAccess = await contract.hasFileAccess(ownerAddress, i, account);
                  if (hasAccess) {
                    const fileData = await contract.displayFile(ownerAddress, i);
                    sharedFiles.push(`${fileData}||OWNER:${ownerAddress}||INDEX:${i}`);
                  }
                } catch {
                  // Skip files that can't be accessed
                  continue;
                }
              }
            } catch (err) {
              console.warn(`Error processing files from ${ownerAddress}: ${err.message}`);
            }
          }

          dataArray = [...new Set(sharedFiles)]; // Remove duplicates
        } catch (err) {
          console.error("Error fetching shared files:", err);
          dataArray = [];
        }
      }

      setData(dataArray || []);
    } catch (e) {
      console.error("Error in fetchFiles:", e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [contract, account, activeTab]);

  // Automatically fetch files when component mounts, account changes, 
  // files are uploaded, or tab is switched
  useEffect(() => {
    if (contract && account) {
      fetchFiles();
    }
  }, [contract, account, refreshTrigger, activeTab, fetchFiles]);

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

  const downloadFile = async (url, fileName) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = fileName || 'download';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download file. Please try again.');
    }
  };

  const toggleFileSelection = (index) => {
    if (selectedFiles.includes(index)) {
      setSelectedFiles(selectedFiles.filter((i) => i !== index));
    } else {
      setSelectedFiles([...selectedFiles, index]);
    }
  };

  const openShareModal = (displayIndex, fileName, originalIndex = null) => {
    console.log(`Opening share modal for file index: ${originalIndex}, display index: ${displayIndex}, name: ${fileName}`);
    setFileToShare({ 
      index: displayIndex, 
      name: fileName,
      originalIndex: originalIndex !== null ? originalIndex : displayIndex
    });
    setFileShareModalOpen(true);
  };

  // Optimize parseFileInfo for better file handling
  const parseFileInfo = (item) => {
    let ipfsUrl, fileName, owner = null, fileIndex = null;
    
    const parts = item.split("||");
    ipfsUrl = parts[0];
    
    // Process each part to extract metadata
    for (let i = 1; i < parts.length; i++) {
      if (parts[i].startsWith("OWNER:")) {
        owner = parts[i].substring(6);
      } else if (parts[i].startsWith("INDEX:")) {
        fileIndex = parseInt(parts[i].substring(6), 10);
      } else if (parts[i]) {
        fileName = parts[i];
      }
    }
    
    // Extract filename from IPFS hash if not found
    if (!fileName) {
      fileName = ipfsUrl.split("/").pop() || "File";
    }
    
    const imageUrl = ipfsUrl.startsWith("ipfs://")
      ? `https://gateway.pinata.cloud/ipfs/${ipfsUrl.substring(7)}`
      : ipfsUrl;
    
    return { fileName, imageUrl, owner, fileIndex };
  };

  return (
    <div className="display-container">
      {activeTab === "myFiles" && (
        <div className="display-header">
          
          {selectedFiles.length > 0 && (
            <button className="delete-group-button" onClick={removeSelectedFiles}>
              Delete Selected Files
            </button>
          )}
        </div>
      )}
      
      {activeTab === "sharedFiles" && (
        <div className="display-header">
          
        </div>
      )}

      {loading ? (
        <div className="loading-indicator">Loading files...</div>
      ) : data.length > 0 ? (
        <div className="image-list">
          {data.map((item, index) => {
            const { ipfsUrl, fileName, imageUrl, owner, fileIndex } = parseFileInfo(item);

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
                          onClick={() => openShareModal(index, fileName, fileIndex)}
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
          fileIndex={fileToShare.originalIndex !== null ? fileToShare.originalIndex : fileToShare.index}
          fileName={fileToShare.name}
        />
      )}
    </div>
  );
};

export default Display;
