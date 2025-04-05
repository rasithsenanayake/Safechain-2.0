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

  // Move fetchFiles into useCallback to avoid dependency issues
  const fetchFiles = useCallback(async () => {
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
        // For shared files tab, we need a different approach
        try {
          // Get the list of users who might have shared with the current user
          const accessList = await contract.shareAccess();
          
          // Create an array to hold all shared files
          let sharedFiles = [];
          
          // First, try to find other accounts that have shared with us
          const accounts = accessList.map(access => access.user);
          
          // Loop through these accounts to check if we have access to their files
          for (let i = 0; i < accounts.length; i++) {
            const ownerAddress = accounts[i];
            
            // Skip our own account
            if (ownerAddress === account) continue;
            
            try {
              // Check if we have access to this owner's files - use the renamed function
              const hasAccess = await contract.hasGlobalAccess(ownerAddress, account);
              
              if (hasAccess) {
                // We have access to all files from this owner
                try {
                  const filesFromOwner = await contract.display(ownerAddress);
                  // Add owner info to each file
                  const filesWithOwner = filesFromOwner.map(file => {
                    return `${file}||OWNER:${ownerAddress}`;
                  });
                  
                  sharedFiles = [...sharedFiles, ...filesWithOwner];
                } catch (err) {
                  console.error(`Error fetching files from ${ownerAddress}:`, err);
                }
              } else {
                // We might have access to individual files
                try {
                  // Need to somehow get the file count for this owner
                  // This is a limitation - we'll try a reasonable number
                  const MAX_FILES_TO_CHECK = 50; 
                  
                  for (let j = 0; j < MAX_FILES_TO_CHECK; j++) {
                    try {
                      // Check if we have access to this specific file
                      const hasIndividualAccess = await contract.hasFileAccess(
                        ownerAddress, 
                        j, 
                        account
                      );
                      
                      if (hasIndividualAccess) {
                        try {
                          // If we have access, get the file data
                          const fileData = await contract.displayFile(ownerAddress, j);
                          // Add owner and index info to the file
                          const fileWithInfo = `${fileData}||OWNER:${ownerAddress}||INDEX:${j}`;
                          sharedFiles.push(fileWithInfo);
                        } catch (err) {
                          // If we can't get the file data, just continue
                          console.warn(`Could not fetch file ${j} from ${ownerAddress}`);
                        }
                      }
                    } catch (err) {
                      // Break the loop if we encounter an error (likely out of bounds)
                      break;
                    }
                  }
                } catch (err) {
                  console.error(`Error checking individual file access for ${ownerAddress}:`, err);
                }
              }
            } catch (err) {
              console.error(`Error checking access for ${ownerAddress}:`, err);
            }
          }
          
          // Set the data array to our collected shared files
          dataArray = sharedFiles;
        } catch (err) {
          console.error("Error fetching shared files:", err);
          dataArray = [];
        }
      }

      setData(dataArray || []);
    } catch (e) {
      console.error("Error fetching data:", e);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [contract, account, activeTab]); // Add all dependencies used in the function

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

  const downloadFile = (url, fileName) => {
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    link.click();
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

  const parseFileInfo = (item) => {
    let fileName, owner = null, fileIndex = null;
    
    const parts = item.split("||");
    const ipfsUrl = parts[0];
    
    // Extract filename, owner, and index from the parts
    for (let i = 1; i < parts.length; i++) {
      if (parts[i].startsWith("OWNER:")) {
        owner = parts[i].substring(6);
      } else if (parts[i].startsWith("INDEX:")) {
        fileIndex = parseInt(parts[i].substring(6), 10);
      } else {
        fileName = parts[i];
      }
    }
    
    // If no filename was found, use a default
    if (!fileName) {
      fileName = `File`;
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
            const { fileName, imageUrl, owner, fileIndex } = parseFileInfo(item);

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
