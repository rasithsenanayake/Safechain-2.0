import { useState, useEffect } from "react";
import FileShareModal from "./FileShareModal";
import "./Display.css";

const Display = ({ contract, account, activeTab, refreshTrigger }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  useEffect(() => {
    const fetchFiles = async () => {
      if (!contract || !account) {
        console.log("Contract or account not available");
        return;
      }

      setLoading(true);
      setError("");
      setData([]);
      
      try {
        console.log(`Fetching ${activeTab} for account ${account}`);
        console.log("Contract address:", contract.address);
        
        let files = [];
        if (activeTab === "myFiles") {
          try {
            console.log("Getting user files for:", account);
            files = await contract.display(account);
            console.log("Raw files from display method:", files);
          } catch (displayError) {
            console.error("Error calling display method:", displayError);
            throw new Error(`Failed to get your files: ${displayError.message}`);
          }
        } else if (activeTab === "sharedFiles") {
          try {
            console.log("Getting shared files for current user");
            files = await contract.getShared();
            console.log("Raw shared files:", files);
          } catch (sharedError) {
            console.error("Error calling getShared method:", sharedError);
            throw new Error(`Failed to get shared files: ${sharedError.message}`);
          }
        }
        
        // Make sure files is an array
        if (!files) {
          files = [];
        }
        
        // Convert files to array if it's not already
        if (!Array.isArray(files)) {
          console.warn("Files data is not an array, converting:", files);
          files = [files];
        }
        
        // Filter out any null or empty values
        const filteredFiles = files.filter(item => 
          item && typeof item === 'string' && item.trim() !== ""
        );
        console.log("Filtered files:", filteredFiles);
        
        // Process the files data
        const processedFiles = filteredFiles.map((item, index) => {
            let fileName = "Unnamed File";
            let url = item;
            
            // Check if the URL has the format ipfs://HASH||FILENAME
            if (item.includes("||")) {
              const parts = item.split("||");
              url = parts[0]; // IPFS URL
              fileName = parts[1]; // Original filename
            }
            
            // Convert IPFS URL to gateway URL if needed
            if (url.startsWith("ipfs://")) {
              url = url.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
            }
            
            // Determine file type for preview
            const fileType = getFileType(fileName);
            
            return { url, fileName, index, fileType };
        });
        
        console.log("Processed files:", processedFiles);
        setData(processedFiles);
      } catch (err) {
        console.error("Error fetching files:", err);
        
        // Provide specific error information
        let errorMessage = "Failed to load files. ";
        
        if (err.message?.includes("non-payable method")) {
          errorMessage += "Contract interaction failed - wrong parameters";
        } else if (err.message?.includes("invalid address")) {
          errorMessage += "Invalid account address";
        } else if (err.code === "CALL_EXCEPTION") {
          errorMessage += "Contract method call failed - method may not exist or contract address is incorrect";
          
          try {
            console.log("Contract ABI methods:", Object.keys(contract.functions || {}));
          } catch (e) {
            console.error("Could not log contract functions:", e);
          }
        } else {
          errorMessage += err.message;
        }
        
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [contract, account, activeTab, refreshTrigger]);

  // Function to open file share modal
  const openShareModal = (fileIndex, fileName) => {
    console.log("Opening share modal for file:", fileName, "index:", fileIndex);
    setSelectedFile({ index: fileIndex, name: fileName });
    setShareModalOpen(true);
  };

  // Function to open file preview
  const openPreview = (file) => {
    setPreviewFile(file);
  };

  // Function to close file preview
  const closePreview = () => {
    setPreviewFile(null);
  };

  // Function to download file directly
  const downloadFile = (url, fileName) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Function to delete a file
  const handleDeleteFile = async () => {
    if (!confirmDelete) return;
    
    try {
      setLoading(true);
      console.log(`Deleting file at index: ${confirmDelete.index}`);
      
      // Check if the contract has a remove method
      if (typeof contract.remove !== 'function') {
        throw new Error("Contract doesn't have a remove function");
      }
      
      const tx = await contract.remove(confirmDelete.index);
      await tx.wait();
      
      // Update the file list
      const updatedData = data.filter(item => item.index !== confirmDelete.index);
      setData(updatedData);
      
      alert(`"${confirmDelete.name}" has been deleted successfully`);
    } catch (error) {
      console.error("Error deleting file:", error);
      alert(`Failed to delete the file: ${error.message}`);
    } finally {
      setLoading(false);
      setConfirmDelete(null);
    }
  };

  // Function to determine the file type icon
  const getFileTypeIcon = (fileName) => {
    if (!fileName) return '📄';
    
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return '📄';
      case 'doc':
      case 'docx':
        return '📝';
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return '🖼️';
      case 'mp4':
      case 'avi':
      case 'mov':
        return '🎬';
      case 'mp3':
      case 'wav':
        return '🎵';
      case 'zip':
      case 'rar':
        return '🗜️';
      case 'xls':
      case 'xlsx':
        return '📊';
      case 'ppt':
      case 'pptx':
        return '📊';
      default:
        return '📄';
    }
  };

  // Function to determine file type
  const getFileType = (fileName) => {
    if (!fileName) return 'other';
    
    const extension = fileName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
      return 'image';
    } else if (['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv'].includes(extension)) {
      return 'video';
    } else if (['mp3', 'wav', 'ogg', 'flac'].includes(extension)) {
      return 'audio';
    } else if (extension === 'pdf') {
      return 'pdf';
    } else {
      return 'other';
    }
  };

  return (
    <div className="display-container">
      <h3 className="display-title">
        {activeTab === "myFiles" ? "My Files" : "Files Shared With Me"}
      </h3>
      
      {loading && (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading files...</p>
        </div>
      )}
      
      {error && (
        <div className="error-message">
          {error}
          <div className="error-details">
            Please check console for more details.
          </div>
        </div>
      )}
      
      {!loading && !error && data.length === 0 && (
        <div className="no-files-message">
          <p>
            {activeTab === "myFiles" 
              ? "You haven't uploaded any files yet."
              : "No files have been shared with you."}
          </p>
        </div>
      )}
      
      {!loading && !error && data.length > 0 && (
        <div className="files-grid">
          {data.map((item) => (
            <div className="file-card" key={item.index}>
              <div className="file-preview-thumbnail">
                {item.fileType === 'image' ? (
                  <img src={item.url} alt={item.fileName} />
                ) : (
                  <div className="file-icon-container">
                    <span className="file-icon">{getFileTypeIcon(item.fileName)}</span>
                  </div>
                )}
                
                {/* Overlay actions visible on hover */}
                <div className="file-hover-actions">
                  <button 
                    className="hover-action-btn view" 
                    title="Preview"
                    onClick={() => openPreview(item)}
                  >
                    View
                  </button>
                  <button 
                    className="hover-action-btn download" 
                    title="Download"
                    onClick={() => downloadFile(item.url, item.fileName)}
                  >
                    DL
                  </button>
                  
                  {activeTab === "myFiles" && (
                    <>
                      <button 
                        className="hover-action-btn share" 
                        title="Share"
                        onClick={() => openShareModal(item.index, item.fileName)}
                      >
                        Share
                      </button>
                      <button 
                        className="hover-action-btn delete" 
                        title="Delete"
                        onClick={() => setConfirmDelete({ index: item.index, name: item.fileName })}
                      >
                        Del
                      </button>
                    </>
                  )}
                </div>
              </div>
              
              <div className="file-details">
                <p className="file-name" title={item.fileName}>{item.fileName}</p>
                <div className="file-actions">
                  <button 
                    className="file-action-btn preview-button"
                    onClick={() => openPreview(item)}
                  >
                    Preview
                  </button>
                  
                  <button 
                    className="file-action-btn download-button"
                    onClick={() => downloadFile(item.url, item.fileName)}
                  >
                    Download
                  </button>
                  
                  {activeTab === "myFiles" && (
                    <>
                      <button 
                        className="file-action-btn share-button"
                        onClick={() => openShareModal(item.index, item.fileName)}
                      >
                        Share
                      </button>
                      <button 
                        className="file-action-btn delete-button"
                        onClick={() => setConfirmDelete({ index: item.index, name: item.fileName })}
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* File Preview Modal */}
      {previewFile && (
        <div className="file-preview-modal">
          <div className="file-preview-content">
            <div className="file-preview-header">
              <h3>{previewFile.fileName}</h3>
              <button onClick={closePreview}>×</button>
            </div>
            
            <div className="file-preview-body">
              {previewFile.fileType === 'image' && (
                <img src={previewFile.url} alt={previewFile.fileName} />
              )}
              
              {previewFile.fileType === 'video' && (
                <video controls>
                  <source src={previewFile.url} type={`video/${previewFile.fileName.split('.').pop()}`} />
                  Your browser does not support video playback.
                </video>
              )}
              
              {previewFile.fileType === 'audio' && (
                <audio controls>
                  <source src={previewFile.url} type={`audio/${previewFile.fileName.split('.').pop()}`} />
                  Your browser does not support audio playback.
                </audio>
              )}
              
              {previewFile.fileType === 'pdf' && (
                <iframe src={`${previewFile.url}#toolbar=0`} title={previewFile.fileName} />
              )}
              
              {previewFile.fileType === 'other' && (
                <div className="generic-preview">
                  <div className="file-icon-large">{getFileTypeIcon(previewFile.fileName)}</div>
                  <p>Preview not available for this file type</p>
                </div>
              )}
            </div>
            
            <div className="file-preview-footer">
              <button 
                className="download-button-large"
                onClick={() => downloadFile(previewFile.url, previewFile.fileName)}
              >
                Download File
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Share Modal */}
      {shareModalOpen && (
        <FileShareModal 
          setModalOpen={setShareModalOpen} 
          contract={contract} 
          fileIndex={selectedFile?.index} 
          fileName={selectedFile?.name}
        />
      )}
      
      {/* Confirm Delete Dialog */}
      {confirmDelete && (
        <div className="confirm-dialog">
          <div className="confirm-dialog-content">
            <div className="dialog-content">
              <h3>Delete File</h3>
              <p>Are you sure you want to delete "{confirmDelete.name}"?</p>
              <p>This action cannot be undone.</p>
            </div>
            <div className="dialog-buttons">
              <button className="cancel" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="confirm" onClick={handleDeleteFile}>Delete File</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Display;
