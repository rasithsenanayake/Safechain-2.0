import { useState, useEffect } from "react";
import "./Display.css";
import FileShareModal from "./FileShareModal";

const Display = ({ contract, account, activeTab, refreshTrigger, triggerRefresh }) => {
  const [data, setData] = useState([]);
  const [sharedData, setSharedData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileShareModalOpen, setFileShareModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    const getMyData = async () => {
      if (!contract || !account) return;

      try {
        setLoading(true);

        if (activeTab === "myFiles") {
          const userFiles = await contract.display(account);

          let formattedData = await Promise.all(
            userFiles.map(async (item, index) => {
              try {
                const parts = item.split("||");
                const url = parts[0].replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
                const fileName = parts.length > 1 ? parts[1] : `File ${index + 1}`;

                let accessList = [];
                try {
                  const rawAccessList = await contract.shareAccess();
                  
                  const processedAccessList = [];
                  
                  for (const access of rawAccessList) {
                    const hasGlobalAccess = access.access;
                    
                    if (hasGlobalAccess) {
                      processedAccessList.push({
                        address: access.user,
                        hasGlobalAccess: true,
                        hasFileAccess: true
                      });
                    } else {
                      try {
                        const hasFileAccess = await contract.hasFileAccess(
                          account,
                          index,
                          access.user
                        );
                        
                        if (hasFileAccess) {
                          processedAccessList.push({
                            address: access.user,
                            hasGlobalAccess: false,
                            hasFileAccess: true
                          });
                        }
                      } catch (err) {
                        console.error(`Error checking file access for ${access.user}:`, err);
                      }
                    }
                  }
                  
                  accessList = processedAccessList;
                } catch (err) {
                  console.error("Error fetching access list:", err);
                }

                return {
                  url,
                  fileName,
                  index,
                  originalURL: item,
                  accessList,
                };
              } catch (err) {
                console.error("Error processing file:", err);
                return {
                  url: "",
                  fileName: `Error: File ${index + 1}`,
                  index,
                  originalURL: item,
                  accessList: [],
                };
              }
            })
          );

          setData(formattedData);
        } else if (activeTab === "sharedFiles") {
          let sharedFiles = [];

          try {
            const accessibleAddresses = await getAddressesWhoSharedWithMe();

            for (const addr of accessibleAddresses) {
              try {
                const userFiles = await contract.display(addr);

                for (let i = 0; i < userFiles.length; i++) {
                  try {
                    let hasAccess = false;
                    try {
                      hasAccess = await contract.hasFileAccess(addr, i, account);
                    } catch (err) {
                      hasAccess = await contract.hasGlobalAccess(addr, account);
                    }

                    if (hasAccess) {
                      const item = userFiles[i];
                      const parts = item.split("||");
                      const url = parts[0].replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
                      const fileName = parts.length > 1 ? parts[1] : `File ${i + 1}`;

                      sharedFiles.push({
                        url,
                        fileName,
                        index: i,
                        originalURL: item,
                        owner: addr,
                        ownerFormatted: `${addr.substring(0, 6)}...${addr.substring(
                          addr.length - 4
                        )}`,
                      });
                    }
                  } catch (err) {
                    console.error("Error processing shared file:", err);
                  }
                }
              } catch (err) {
                console.error(`Error fetching files from ${addr}:`, err);
              }
            }

            setSharedData(sharedFiles);
          } catch (err) {
            console.error("Error fetching shared files:", err);
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    getMyData();
  }, [contract, account, activeTab, refreshTrigger]);

  const getAddressesWhoSharedWithMe = async () => {
    try {
      if (contract.getSharersWithMe) {
        return await contract.getSharersWithMe();
      } else {
        const allUsers = await getAllUsers();
        const accessibleAddresses = [];

        for (const addr of allUsers) {
          if (addr !== account) {
            try {
              const hasAccess = await contract.hasGlobalAccess(addr, account);
              if (hasAccess) {
                accessibleAddresses.push(addr);
              }
            } catch (err) {
              console.error(`Error checking access for ${addr}:`, err);
            }
          }
        }

        return accessibleAddresses;
      }
    } catch (err) {
      console.error("Error getting sharers:", err);
      return [];
    }
  };

  const getAllUsers = async () => {
    return [
      "0x5B38Da6a701c568545dCfcB03FcB875f56beddC4",
      "0xAb8483F64d9C6d1EcF9b849Ae677dD3315835cb2",
    ];
  };

  const getFileType = (url, fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    // Image types
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'].includes(extension)) {
      return 'image';
    }
    
    // Document types
    if (['pdf'].includes(extension)) {
      return 'pdf';
    }
    
    if (['doc', 'docx'].includes(extension)) {
      return 'doc';
    }
    
    if (['xls', 'xlsx', 'csv'].includes(extension)) {
      return 'xls';
    }
    
    if (['ppt', 'pptx'].includes(extension)) {
      return 'ppt';
    }
    
    // Video types
    if (['mp4', 'webm', 'mov', 'avi'].includes(extension)) {
      return 'video';
    }
    
    // Audio types
    if (['mp3', 'wav', 'ogg', 'aac'].includes(extension)) {
      return 'audio';
    }
    
    return 'other';
  };
  
  const openPreview = (file) => {
    setPreviewFile(file);
    setShowPreview(true);
  };
  
  const closePreview = () => {
    setShowPreview(false);
    setPreviewFile(null);
  };
  
  const renderFilePreview = () => {
    if (!previewFile) return null;
    
    const fileType = getFileType(previewFile.url, previewFile.fileName);
    
    return (
      <div className="file-preview-modal" onClick={closePreview}>
        <div className="file-preview-container" onClick={(e) => e.stopPropagation()}>
          <div className="file-preview-header">
            <h3>{previewFile.fileName}</h3>
            <button className="close-preview" onClick={closePreview}>×</button>
          </div>
          <div className="file-preview-content">
            {fileType === 'image' ? (
              <img src={previewFile.url} alt={previewFile.fileName} className="preview-image" />
            ) : fileType === 'video' ? (
              <video controls className="preview-document">
                <source src={previewFile.url} type={`video/${previewFile.fileName.split('.').pop()}`} />
                Your browser does not support video playback.
              </video>
            ) : fileType === 'pdf' ? (
              <iframe 
                src={`${previewFile.url}#toolbar=0`} 
                title={previewFile.fileName} 
                className="preview-document"
              />
            ) : (
              <div className="generic-preview">
                <div className={`generic-file file-type-${fileType}`}>
                  <div className="file-extension">
                    {previewFile.fileName.split('.').pop().toUpperCase()}
                  </div>
                </div>
                <p className="preview-message">Preview not available. Click the button below to open this file.</p>
                <button onClick={() => window.open(previewFile.url)} className="open-file-btn">
                  Open File
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const removeFile = async (index) => {
    try {
      setLoading(true);
      const tx = await contract.removeFile(index);
      await tx.wait();
      alert("File removed successfully!");
      triggerRefresh();
    } catch (error) {
      console.error("Error removing file:", error);
      alert("Failed to remove file. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const openFileShareModal = (fileInfo) => {
    setSelectedFile(fileInfo);
    setFileShareModalOpen(true);
  };

  const downloadFile = (url, fileName) => {
    // For IPFS files, we need to fetch them first
    fetch(url)
      .then(response => response.blob())
      .then(blob => {
        // Create a blob URL for the file
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create a temporary link element
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = fileName;
        
        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        
        // Clean up
        setTimeout(() => {
          document.body.removeChild(link);
          window.URL.revokeObjectURL(blobUrl);
        }, 100);
      })
      .catch(error => {
        console.error('Download failed:', error);
        // Fallback to direct link if fetch fails
        window.open(url, '_blank');
      });
  };

  return (
    <div className="display-container">
      {fileShareModalOpen && selectedFile && (
        <FileShareModal
          setModalOpen={setFileShareModalOpen}
          contract={contract}
          fileIndex={selectedFile.index}
          fileName={selectedFile.fileName}
          triggerRefresh={triggerRefresh}
        />
      )}
      
      {showPreview && renderFilePreview()}

      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <p>Loading files...</p>
        </div>
      ) : activeTab === "myFiles" ? (
        <div className="files-grid">
          {data.length === 0 ? (
            <div className="no-files">
              <p>You haven't uploaded any files yet.</p>
            </div>
          ) : (
            data.map((item, index) => {
              const fileType = getFileType(item.url, item.fileName);
              return (
                <div className="file-card" key={`${index}-${refreshTrigger}`}>
                  <div 
                    className={`file-thumbnail file-type-${fileType}`}
                    onClick={() => openPreview(item)}
                  >
                    {fileType === 'image' ? (
                      <img src={item.url} alt={item.fileName} />
                    ) : (
                      <div className={`generic-file file-type-${fileType}`}>
                        <div className="file-extension">
                          {item.fileName.split(".").length > 1
                            ? item.fileName.split(".").pop().toUpperCase()
                            : "FILE"}
                        </div>
                      </div>
                    )}
                    <div className="preview-overlay">
                      <div className="preview-icon">👁️</div>
                    </div>
                  </div>

                  <div className="file-info">
                    <h3 title={item.fileName}>{item.fileName}</h3>

                    <div className="access-indicator">
                      {item.accessList && item.accessList.length > 0 ? (
                        <span title="Shared with users">
                          Shared with {item.accessList.length} user(s)
                        </span>
                      ) : (
                        <span>Not shared</span>
                      )}
                    </div>
                  </div>

                  <div className="file-actions">
                    <button onClick={() => downloadFile(item.url, item.fileName)}>Download</button>
                    <button onClick={() => openFileShareModal(item)}>Share</button>
                    <button
                      className="remove-btn"
                      onClick={() => removeFile(item.index)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="files-grid">
          {sharedData.length === 0 ? (
            <div className="no-files">
              <p>No one has shared files with you yet.</p>
            </div>
          ) : (
            sharedData.map((item, index) => {
              const fileType = getFileType(item.url, item.fileName);
              return (
                <div className="file-card shared" key={`shared-${index}-${refreshTrigger}`}>
                  <div 
                    className={`file-thumbnail file-type-${fileType}`}
                    onClick={() => openPreview(item)}
                  >
                    {fileType === 'image' ? (
                      <img src={item.url} alt={item.fileName} />
                    ) : (
                      <div className={`generic-file file-type-${fileType}`}>
                        <div className="file-extension">
                          {item.fileName.split(".").length > 1
                            ? item.fileName.split(".").pop().toUpperCase()
                            : "FILE"}
                        </div>
                      </div>
                    )}
                    <div className="preview-overlay">
                      <div className="preview-icon">👁️</div>
                    </div>
                  </div>

                  <div className="file-info">
                    <h3 title={item.fileName}>{item.fileName}</h3>
                    <div className="owner-info">
                      Shared by: <span title={item.owner}>{item.ownerFormatted}</span>
                    </div>
                  </div>

                  <div className="file-actions">
                    <button onClick={() => downloadFile(item.url, item.fileName)}>Download</button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};

export default Display;
