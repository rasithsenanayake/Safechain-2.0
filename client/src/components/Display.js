import { useState } from "react";
import FileShareModal from "./FileShareModal";
import "./Display.css";

const Display = ({ contract, account }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [address, setAddress] = useState("");
  const [fileShareModalOpen, setFileShareModalOpen] = useState(false);
  const [fileToShare, setFileToShare] = useState({ index: null, name: "" });

  const getdata = async () => {
    if (!contract) {
      alert("Please connect your wallet");
      return;
    }

    setLoading(true);

    try {
      let dataArray;

      if (address) {
        dataArray = await contract.display(address);
      } else {
        dataArray = await contract.display(account);
      }

      if (dataArray.length === 0) {
        alert("No files to display");
        setData([]);
        setLoading(false);
        return;
      }

      setData(dataArray);
    } catch (e) {
      console.error("Error fetching data:", e);
      alert("You don't have access to these files or there was an error loading them");
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

      const tx = await contract.removeFile(index); // Ensure this function exists in the ABI
      await tx.wait();
      alert("File removed successfully!");
      getdata(); // Refresh the file list
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

      const tx = await contract.removeFiles(validIndices); // Ensure this function exists in the ABI
      await tx.wait();
      alert("Selected files removed successfully!");
      setSelectedFiles([]); // Clear the selection
      getdata(); // Refresh the file list
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

  const handleAddressChange = (e) => {
    setAddress(e.target.value);
  };

  const openShareModal = (index, fileName) => {
    setFileToShare({ index, name: fileName });
    setFileShareModalOpen(true);
  };

  return (
    <div className="display-container">
      <div className="search-section">
        <input
          type="text"
          placeholder="Enter wallet address or leave empty for your files"
          className="address-search"
          value={address}
          onChange={handleAddressChange}
        />
        <button className="refresh-button" onClick={getdata} disabled={loading}>
          {loading ? "Loading..." : "Get Files"}
        </button>
        {selectedFiles.length > 0 && (
          <button className="delete-group-button" onClick={removeSelectedFiles}>
            Delete Selected Files
          </button>
        )}
      </div>

      {data.length > 0 && <div className="files-heading">Available Files</div>}

      <div className="image-list">
        {data.map((item, index) => {
          const [ipfsUrl, fileName] = item.includes("||")
            ? item.split("||")
            : [item, `File ${index + 1}`];
          const imageUrl = ipfsUrl.startsWith("ipfs://")
            ? `https://gateway.pinata.cloud/ipfs/${ipfsUrl.substring(7)}`
            : ipfsUrl;

          return (
            <div key={index} className="image-card">
              <input
                type="checkbox"
                className="file-select-checkbox"
                checked={selectedFiles.includes(index)}
                onChange={() => toggleFileSelection(index)}
              />
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
                <div className="image-actions">
                  <button className="delete-button" onClick={() => removeFile(index)}>
                    Delete
                  </button>
                  <button
                    className="download-button"
                    onClick={() => downloadFile(imageUrl, fileName)}
                  >
                    Download
                  </button>
                  <button 
                    className="share-file-button"
                    onClick={() => openShareModal(index, fileName)}
                  >
                    Share
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {data.length === 0 && !loading && (
        <div className="no-files">
          <p>No files to display. Upload new files or refresh the list.</p>
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
