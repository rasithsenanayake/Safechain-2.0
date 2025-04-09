import { useEffect, useState } from "react";
import { ethers } from "ethers";
import "./Display.css";
import FileShareModal from "./FileShareModal";

const Display = ({ contract, account, activeTab, refreshTrigger, triggerRefresh }) => {
  const [data, setData] = useState([]);
  const [sharedData, setSharedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareFileIndex, setShareFileIndex] = useState(null);
  const [shareFileName, setShareFileName] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [sharersWithMe, setSharersWithMe] = useState([]);

  const fetchSharersWithMe = async () => {
    if (!contract || !account) return [];
    
    try {
      console.log("Fetching sharers with current user...");
      
      if (typeof contract.getSharersWithMe === 'function') {
        const sharers = await contract.getSharersWithMe();
        console.log("Sharers returned from contract:", sharers);
        return sharers;
      }
      
      console.log("getSharersWithMe function not available, using fallback");
      
      const storedAddresses = localStorage.getItem('knownAddresses');
      let knownAddresses = storedAddresses ? JSON.parse(storedAddresses) : [];
      
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const network = await provider.getNetwork();
        
        const currentBlock = await provider.getBlockNumber();
        const recentBlock = await provider.getBlock(currentBlock);
        
        if (recentBlock && recentBlock.transactions) {
          for (let i = 0; i < Math.min(5, recentBlock.transactions.length); i++) {
            const txHash = recentBlock.transactions[i];
            const tx = await provider.getTransaction(txHash);
            if (tx && tx.from && !knownAddresses.includes(tx.from)) {
              knownAddresses.push(tx.from);
            }
          }
        }
      } catch (error) {
        console.error("Error getting potential sharers:", error);
      }
      
      const confirmedSharers = [];
      for (const addr of knownAddresses) {
        if (addr !== account) {
          try {
            const hasAccess = await contract.hasGlobalAccess(addr, account);
            if (hasAccess) {
              confirmedSharers.push(addr);
            }
          } catch (error) {
            console.error(`Error checking if ${addr} has shared with current user:`, error);
          }
        }
      }
      
      console.log("Confirmed sharers from fallback method:", confirmedSharers);
      return confirmedSharers;
    } catch (error) {
      console.error("Error fetching sharers:", error);
      return [];
    }
  };

  const saveKnownAddresses = (addresses) => {
    try {
      const existingAddresses = localStorage.getItem('knownAddresses');
      const parsedExisting = existingAddresses ? JSON.parse(existingAddresses) : [];
      
      const uniqueAddresses = [...new Set([...parsedExisting, ...addresses])];
      localStorage.setItem('knownAddresses', JSON.stringify(uniqueAddresses));
    } catch (error) {
      console.error("Error saving addresses to localStorage:", error);
    }
  };

  useEffect(() => {
    const fetchFiles = async () => {
      if (!contract || !account) {
        setData([]);
        setSharedData([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        
        if (activeTab === "myFiles") {
          try {
            const userFiles = await contract.display(account);
            console.log("User files:", userFiles);
            
            const formattedUserData = userFiles.map((item, index) => {
              let ipfsHash, fileName;
              
              if (item.includes("||")) {
                [ipfsHash, fileName] = item.split("||");
              } else {
                ipfsHash = item;
                fileName = `File ${index + 1}`;
              }
              
              return {
                url: ipfsHash,
                fileName,
                owner: account,
                index
              };
            });
            
            setData(formattedUserData);
          } catch (error) {
            console.error("Error fetching user files:", error);
            setError("Failed to fetch your files. Please try again.");
          }
        } else if (activeTab === "sharedFiles") {
          console.log("Fetching shared files for account:", account);
          
          try {
            const sharers = await fetchSharersWithMe();
            console.log("Found potential sharers:", sharers);
            setSharersWithMe(sharers);
            
            if (sharers.length > 0) {
              saveKnownAddresses(sharers);
            }
            
            let allSharedFiles = [];
            
            for (const sharerAddress of sharers) {
              try {
                console.log(`Checking files from ${sharerAddress}...`);
                
                const hasGlobalAccess = await contract.hasGlobalAccess(sharerAddress, account);
                
                if (hasGlobalAccess) {
                  console.log(`We have global access to files from ${sharerAddress}`);
                  const files = await contract.display(sharerAddress);
                  console.log(`Files from ${sharerAddress}:`, files);
                  
                  const formattedFiles = files.map((item, index) => {
                    let ipfsHash, fileName;
                    
                    if (item.includes("||")) {
                      [ipfsHash, fileName] = item.split("||");
                    } else {
                      ipfsHash = item;
                      fileName = `File ${index + 1}`;
                    }
                    
                    return {
                      url: ipfsHash,
                      fileName,
                      owner: sharerAddress,
                      index,
                      isShared: true,
                      accessType: "global"
                    };
                  });
                  
                  allSharedFiles = [...allSharedFiles, ...formattedFiles];
                } else {
                  console.log(`Checking for individually shared files from ${sharerAddress}`);
                  
                  const fileCount = await contract.getFileCount(sharerAddress);
                  console.log(`User has ${fileCount} files`);
                  
                  for (let i = 0; i < fileCount; i++) {
                    try {
                      const hasFileAccess = await contract.hasFileAccess(sharerAddress, i, account);
                      
                      if (hasFileAccess) {
                        console.log(`We have access to file ${i} from ${sharerAddress}`);
                        const fileUrl = await contract.displayFile(sharerAddress, i);
                        
                        let ipfsHash, fileName;
                        if (fileUrl.includes("||")) {
                          [ipfsHash, fileName] = fileUrl.split("||");
                        } else {
                          ipfsHash = fileUrl;
                          fileName = `File ${i + 1}`;
                        }
                        
                        allSharedFiles.push({
                          url: ipfsHash,
                          fileName,
                          owner: sharerAddress,
                          index: i,
                          isShared: true,
                          accessType: "individual"
                        });
                      }
                    } catch (error) {
                      console.error(`Error checking access to file ${i} from ${sharerAddress}:`, error);
                    }
                  }
                }
              } catch (error) {
                console.error(`Error processing files from ${sharerAddress}:`, error);
              }
            }
            
            console.log("All shared files:", allSharedFiles);
            setSharedData(allSharedFiles);
          } catch (error) {
            console.error("Error processing shared files:", error);
            setError("Failed to fetch shared files. Please try again.");
          }
        }
      } catch (error) {
        console.error("Error in data fetching:", error);
        setError("Failed to fetch files. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [contract, account, activeTab, refreshTrigger]);

  const handlePreview = (file) => {
    setSelectedFile(file);
    setPreviewModalOpen(true);
  };

  const handleShare = (index, fileName) => {
    setShareFileIndex(index);
    setShareFileName(fileName);
    setShareModalOpen(true);
  };

  const confirmDelete = (index) => {
    setFileToDelete(index);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (fileToDelete === null) return;
    
    try {
      setLoading(true);
      const tx = await contract.removeFile(fileToDelete);
      await tx.wait();
      
      setData(prev => prev.filter((_, i) => i !== fileToDelete));
      
      setDeleteConfirmOpen(false);
      setFileToDelete(null);
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("Failed to delete file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getFilePreview = (url, fileName) => {
    if (url.startsWith("ipfs://")) {
      url = `https://ipfs.io/ipfs/${url.substring(7)}`;
    }
    
    const extension = fileName.split('.').pop().toLowerCase();
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const videoTypes = ['mp4', 'webm', 'ogg', 'mov'];
    const audioTypes = ['mp3', 'wav', 'ogg', 'aac'];
    const pdfType = 'pdf';
    
    if (imageTypes.includes(extension)) {
      return <img src={url} alt={fileName} />;
    } else if (videoTypes.includes(extension)) {
      return <div className="file-icon">VIDEO</div>;
    } else if (audioTypes.includes(extension)) {
      return <div className="file-icon">AUDIO</div>;
    } else if (extension === pdfType) {
      return <div className="file-icon">PDF</div>;
    } else {
      return <div className="file-icon">{extension.toUpperCase()}</div>;
    }
  };

  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const renderPreviewModal = () => {
    if (!selectedFile) return null;
    
    let previewUrl = selectedFile.url;
    if (previewUrl.startsWith("ipfs://")) {
      previewUrl = `https://ipfs.io/ipfs/${previewUrl.substring(7)}`;
    }
    
    const extension = selectedFile.fileName.split('.').pop().toLowerCase();
    const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    const videoTypes = ['mp4', 'webm', 'ogg', 'mov'];
    const audioTypes = ['mp3', 'wav', 'ogg', 'aac'];
    const pdfType = 'pdf';
    
    return (
      <div className="file-preview-modal">
        <div className="file-preview-content">
          <div className="file-preview-header">
            <h3>{selectedFile.fileName}</h3>
            <button onClick={() => setPreviewModalOpen(false)}>×</button>
          </div>
          <div className="file-preview-body">
            {imageTypes.includes(extension) ? (
              <img src={previewUrl} alt={selectedFile.fileName} />
            ) : videoTypes.includes(extension) ? (
              <video controls src={previewUrl}>
                Your browser does not support the video tag.
              </video>
            ) : audioTypes.includes(extension) ? (
              <audio controls src={previewUrl}>
                Your browser does not support the audio tag.
              </audio>
            ) : extension === pdfType ? (
              <iframe src={`${previewUrl}#toolbar=0`} title={selectedFile.fileName}></iframe>
            ) : (
              <div className="generic-preview">
                <div className="file-icon-large">{extension.toUpperCase()}</div>
                <h4>{selectedFile.fileName}</h4>
                <p>This file type cannot be previewed directly.</p>
                <a 
                  href={previewUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="download-link"
                >
                  Download File
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderDeleteConfirmation = () => {
    if (!deleteConfirmOpen) return null;
    
    const fileToDeleteName = data[fileToDelete]?.fileName || "this file";
    
    return (
      <div className="confirm-dialog">
        <div className="confirm-dialog-content">
          <h3>Confirm Deletion</h3>
          <p>Are you sure you want to delete "{fileToDeleteName}"?</p>
          <p>This action cannot be undone.</p>
          
          <div className="dialog-buttons">
            <button onClick={() => setDeleteConfirmOpen(false)}>Cancel</button>
            <button onClick={handleDelete}>Delete</button>
          </div>
        </div>
      </div>
    );
  };

  const displayFiles = activeTab === "myFiles" ? data : sharedData;

  return (
    <div className="display-container">
      <h3 className="display-title">
        {activeTab === "myFiles" ? "My Files" : "Shared With Me"}
      </h3>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading files...</p>
        </div>
      ) : error ? (
        <div className="error-message">
          <p>{error}</p>
        </div>
      ) : displayFiles.length === 0 ? (
        <div className={activeTab === "sharedFiles" ? "empty-shared-files" : "no-files-message"}>
          {activeTab === "sharedFiles" ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <h4>No shared files yet</h4>
              <p>No one has shared any files with you. When someone shares files, they'll appear here.</p>
            </>
          ) : (
            <p>You haven't uploaded any files yet.</p>
          )}
        </div>
      ) : (
        <div className="files-grid">
          {displayFiles.map((item, index) => (
            <div className="file-card" key={`${item.owner}-${item.index}-${index}`}>
              <div 
                className="file-preview-thumbnail"
                onClick={() => handlePreview(item)}
              >
                {getFilePreview(item.url, item.fileName)}
                {item.isShared && <div className="shared-indicator">S</div>}
              </div>
              <div className="file-details">
                <div className="file-name">{item.fileName}</div>
                {item.isShared && (
                  <div className="file-owner">
                    From: {formatAddress(item.owner)}
                  </div>
                )}
                <div className="file-actions">
                  <button onClick={() => handlePreview(item)}>View</button>
                  {activeTab === "myFiles" && (
                    <>
                      <button onClick={() => handleShare(item.index, item.fileName)}>Share</button>
                      <button onClick={() => confirmDelete(item.index)}>Delete</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {previewModalOpen && selectedFile && renderPreviewModal()}
      {deleteConfirmOpen && renderDeleteConfirmation()}
      
      {shareModalOpen && (
        <FileShareModal
          setModalOpen={setShareModalOpen}
          contract={contract}
          fileIndex={shareFileIndex}
          fileName={shareFileName}
          account={account}
          triggerRefresh={triggerRefresh}
        />
      )}
    </div>
  );
};

export default Display;
