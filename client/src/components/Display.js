import { useState, useEffect } from "react";
import FileShareModal from "./FileShareModal";
import "./Display.css";

const Display = ({ contract, account, activeTab, refreshTrigger, triggerRefresh }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  // File type helpers
  const getFileType = (fileName) => {
    if (!fileName) return 'other';
    const extension = fileName.split('.').pop().toLowerCase();
    
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) return 'image';
    if (['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv'].includes(extension)) return 'video';
    if (['mp3', 'wav', 'ogg', 'flac'].includes(extension)) return 'audio';
    if (extension === 'pdf') return 'pdf';
    return 'other';
  };
  
  const getFileTypeIcon = (fileName) => {
    if (!fileName) return '📄';
    const extension = fileName.split('.').pop().toLowerCase();
    
    const iconMap = {
      'pdf': '📄',
      'doc': '📝', 'docx': '📝',
      'jpg': '🖼️', 'jpeg': '🖼️', 'png': '🖼️', 'gif': '🖼️',
      'mp4': '🎬', 'avi': '🎬', 'mov': '🎬',
      'mp3': '🎵', 'wav': '🎵',
      'zip': '🗜️', 'rar': '🗜️',
      'xls': '📊', 'xlsx': '📊',
      'ppt': '📊', 'pptx': '📊'
    };
    
    return iconMap[extension] || '📄';
  };
  
  // Combined file action handlers
  const openShareModal = (fileIndex, fileName) => {
    setSelectedFile({ index: fileIndex, name: fileName });
    setShareModalOpen(true);
  };
  
  const downloadFile = (url, fileName) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName || 'download';
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleDeleteFile = async () => {
    if (!confirmDelete) return;
    
    try {
      setLoading(true);
      const deleteMethod = contract.removeFile || contract.remove;
      
      if (typeof deleteMethod !== 'function') {
        throw new Error("Contract doesn't have a file removal function");
      }
      
      const tx = await deleteMethod(confirmDelete.index);
      await tx.wait();
      
      setData(data.filter(item => item.index !== confirmDelete.index));
      alert(`"${confirmDelete.name}" has been deleted successfully`);
      
      if (typeof triggerRefresh === 'function') triggerRefresh();
    } catch (error) {
      console.error("Error deleting file:", error);
      alert(`Failed to delete the file: ${error.message}`);
    } finally {
      setLoading(false);
      setConfirmDelete(null);
    }
  };
  
  // Fetch files from blockchain
  useEffect(() => {
    const fetchFiles = async () => {
      if (!contract || !account) return;
      setLoading(true);
      setError("");
      setData([]);
      
      try {
        const files = await (activeTab === "myFiles" 
          ? contract.display(account) 
          : contract.getShared());
        
        const fileArray = Array.isArray(files) ? files : [files].filter(Boolean);
        const filteredFiles = fileArray.filter(item => 
          item && typeof item === 'string' && item.trim() !== ""
        );
        
        const processedFiles = filteredFiles.map((item, index) => {
          let fileName = "Unnamed File";
          let url = item;
          
          if (item.includes("||")) {
            const parts = item.split("||");
            url = parts[0];
            fileName = parts[1];
          }
          
          if (url.startsWith("ipfs://")) {
            url = url.replace("ipfs://", "https://gateway.pinata.cloud/ipfs/");
          }
          
          return { url, fileName, index, fileType: getFileType(fileName) };
        });
        
        setData(processedFiles);
      } catch (err) {
        console.error("Error fetching files:", err);
        setError(`Failed to load files. ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [contract, account, activeTab, refreshTrigger]);

  // Simplified file rendering
  const renderFileItem = (item) => (
    <div className="file-card" key={item.index}>
      <div className="file-preview-thumbnail" onClick={() => setPreviewFile(item)}>
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
          <button onClick={() => downloadFile(item.url, item.fileName)}>Download</button>
          
          {activeTab === "myFiles" && (
            <>
              <button onClick={() => openShareModal(item.index, item.fileName)}>Share</button>
              <button onClick={() => setConfirmDelete({ index: item.index, name: item.fileName })}>Delete</button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // Simplified preview content rendering
  const renderPreviewContent = () => {
    if (!previewFile) return null;
    
    const { fileType, url, fileName } = previewFile;
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (fileType) {
      case 'image':
        return <img src={url} alt={fileName} />;
      case 'video':
        return <video controls><source src={url} type={`video/${extension}`} />Video not supported</video>;
      case 'audio':
        return <audio controls><source src={url} type={`audio/${extension}`} />Audio not supported</audio>;
      case 'pdf':
        return <iframe src={`${url}#toolbar=0`} title={fileName} />;
      default:
        return (
          <div className="generic-preview">
            <div className="file-icon-large">{getFileTypeIcon(fileName)}</div>
            <p>Preview not available</p>
          </div>
        );
    }
  };

  // Streamlined component render
  return (
    <div className="display-container">
      <h3 className="display-title">
        {activeTab === "myFiles" ? "My Files" : "Files Shared With Me"}
      </h3>
      
      {loading && <div className="loading-container"><div className="loading-spinner"></div><p>Loading...</p></div>}
      {error && <div className="error-message">{error}</div>}
      
      {!loading && !error && data.length === 0 && (
        <div className="no-files-message">
          <p>{activeTab === "myFiles" ? "No files uploaded yet." : "No shared files."}</p>
        </div>
      )}
      
      {!loading && !error && data.length > 0 && (
        <div className="files-grid">{data.map(renderFileItem)}</div>
      )}
      
      {/* Modals */}
      {previewFile && (
        <div className="file-preview-modal">
          <div className="file-preview-content">
            <div className="file-preview-header">
              <h3>{previewFile.fileName}</h3>
              <button onClick={() => setPreviewFile(null)}>×</button>
            </div>
            <div className="file-preview-body">{renderPreviewContent()}</div>
            <button onClick={() => downloadFile(previewFile.url, previewFile.fileName)}>
              Download File
            </button>
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
      
      {confirmDelete && (
        <div className="confirm-dialog">
          <div className="confirm-dialog-content">
            <h3>Delete File</h3>
            <p>Delete "{confirmDelete.name}"?</p>
            <div className="dialog-buttons">
              <button onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button onClick={handleDeleteFile}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Display;
