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
        console.log("Contract:", contract);
        console.log("Contract address:", contract.address);
        
        // Debug available contract methods
        const methods = Object.keys(contract.functions || {});
        console.log("Available contract methods:", methods);
        
        let files = [];
        if (activeTab === "myFiles") {
          try {
            console.log("Calling display method with account:", account);
            files = await contract.display(account);
            console.log("Raw files from display method:", files);
          } catch (displayError) {
            console.error("Error calling display method:", displayError);
            throw new Error(`Failed to get your files: ${displayError.message}`);
          }
        } else if (activeTab === "sharedFiles") {
          try {
            console.log("Calling getShared method");
            files = await contract.getShared();
            console.log("Raw files from getShared method:", files);
          } catch (sharedError) {
            console.error("Error calling getShared method:", sharedError);
            throw new Error(`Failed to get shared files: ${sharedError.message}`);
          }
        }
        
        if (!files || !Array.isArray(files)) {
          console.error("Files data is not an array:", files);
          throw new Error("Invalid response format from contract");
        }
        
        // Filter out any null or empty values
        const filteredFiles = files.filter(item => item && typeof item === 'string' && item.trim() !== "");
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
        
        // More detailed error handling
        let errorMessage = "Failed to load files. ";
        
        if (err.message.includes("non-payable method")) {
          errorMessage += "Contract interaction failed - wrong parameters";
        } else if (err.message.includes("invalid address")) {
          errorMessage += "Invalid account address";
        } else if (err.code === "CALL_EXCEPTION") {
          errorMessage += "Contract method call failed - method may not exist";
          // Try to get more info about the contract
          try {
            console.log("Contract ABI:", contract.interface.format());
          } catch (e) {
            console.error("Could not log contract interface:", e);
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

  const openShareModal = (fileIndex, fileName) => {
    setSelectedFile({ index: fileIndex, name: fileName });
    setShareModalOpen(true);
  };

  const openPreview = (file) => {
    setPreviewFile(file);
  };

  const closePreview = () => {
    setPreviewFile(null);
  };

  const downloadFile = (url, fileName) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          {activeTab === "myFiles" 
            ? "You haven't uploaded any files yet."
            : "No files have been shared with you."}
        </div>
      )}
      
      {!loading && !error && data.length > 0 && (
        <div className="display-box">
          {data.map((item, index) => (
            <div className="file-card" key={index}>
              <div className="file-preview-thumbnail" onClick={() => openPreview(item)}>
                {item.fileType === 'image' ? (
                  <img src={item.url} alt={item.fileName} />
                ) : (
                  <div className="file-icon-container">
                    <span className="file-icon">{getFileTypeIcon(item.fileName)}</span>
                  </div>
                )}
              </div>
              <div className="file-details">
                <p className="file-name" title={item.fileName}>{item.fileName}</p>
                <div className="file-actions">
                  <button 
                    className="preview-button"
                    onClick={() => openPreview(item)}
                  >
                    Preview
                  </button>
                  
                  <button 
                    className="download-button"
                    onClick={() => downloadFile(item.url, item.fileName)}
                  >
                    Download
                  </button>
                  
                  {activeTab === "myFiles" && (
                    <button 
                      className="share-button"
                      onClick={() => openShareModal(item.index, item.fileName)}
                    >
                      Share
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
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
      
      {shareModalOpen && (
        <FileShareModal 
          setModalOpen={setShareModalOpen} 
          contract={contract} 
          fileIndex={selectedFile?.index} 
          fileName={selectedFile?.name}
        />
      )}
    </div>
  );
};

export default Display;
