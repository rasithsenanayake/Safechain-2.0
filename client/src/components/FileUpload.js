import { useState } from "react";
import axios from "axios";
import "./FileUpload.css";

const FileUpload = ({ contract, account, provider, triggerRefresh }) => {
  const [file, setFile] = useState(null);
  const [fileName, setFileName] = useState("No file selected");
  const [uploading, setUploading] = useState(false);
  const [filePreview, setFilePreview] = useState(null);
  const [fileType, setFileType] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!file) {
      alert("Please select a file first");
      return;
    }
    
    if (!contract) {
      alert("Please connect your wallet");
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append("file", file);

      // Display upload progress message
      const uploadStatusElement = document.getElementById('upload-status');
      if (uploadStatusElement) {
        uploadStatusElement.textContent = "Uploading to IPFS...";
      }
      
      // Add metadata to include the original file name
      const metadata = JSON.stringify({
        name: fileName,
      });
      
      formData.append('pinataMetadata', metadata);
      
      // Optional pinata options
      const pinataOptions = JSON.stringify({
        cidVersion: 0,
      });
      formData.append('pinataOptions', pinataOptions);
      
      console.log("Uploading to Pinata...");
      
      const resFile = await axios({
        method: "post",
        url: "https://api.pinata.cloud/pinning/pinFileToIPFS",
        data: formData,
        headers: {
          pinata_api_key: `dfb9f22a84581fd59e8b`,
          pinata_secret_api_key: `6db6a1fa8811e390c01570f310954d9784eced9dba303468d01b61805a6da060`,
          "Content-Type": "multipart/form-data",
        },
      });
      
      console.log("Pinata response:", resFile.data);
      
      // Store both the IPFS hash and the original filename in the contract
      // Format: ipfs://HASH||FILENAME
      const ImgHash = `ipfs://${resFile.data.IpfsHash}||${fileName}`;
      
      if (uploadStatusElement) {
        uploadStatusElement.textContent = "Adding to blockchain...";
      }
      
      // Log the ImgHash for debugging
      console.log("Storing IPFS hash with filename:", ImgHash);
      
      // Add the file to the blockchain
      const tx = await contract.add(account, ImgHash);
      await tx.wait(); // Wait for transaction to be mined
      
      // Success message
      if (uploadStatusElement) {
        uploadStatusElement.textContent = "Upload complete!";
        setTimeout(() => {
          uploadStatusElement.textContent = "";
        }, 3000);
      }
      
      alert("File uploaded successfully!");
      setFileName("No file selected");
      setFile(null);
      setFilePreview(null);
      
      // Trigger file refresh in parent component
      triggerRefresh();
    } catch (e) {
      console.error("Error uploading file:", e);
      alert("Failed to upload file. Please try again.");
      
      const uploadStatusElement = document.getElementById('upload-status');
      if (uploadStatusElement) {
        uploadStatusElement.textContent = "Upload failed";
        setTimeout(() => {
          uploadStatusElement.textContent = "";
        }, 3000);
      }
    } finally {
      setUploading(false);
    }
  };

  const retrieveFile = (e) => {
    const data = e.target.files[0];
    if (!data) return;
    
    // Determine file type
    const fileExtension = data.name.split('.').pop().toLowerCase();
    const type = getFileTypeCategory(fileExtension, data.type);
    setFileType(type);
    
    // Create preview for the selected file
    if (data.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target.result);
      };
      reader.readAsDataURL(data);
    } else if (data.type.startsWith('video/')) {
      // For videos, create a video preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target.result);
      };
      reader.readAsDataURL(data);
    } else if (data.type.startsWith('audio/')) {
      // For audio, create an audio preview
      const reader = new FileReader();
      reader.onload = (event) => {
        setFilePreview(event.target.result);
      };
      reader.readAsDataURL(data);
    } else {
      // For non-media files, set a generic preview based on file type
      setFilePreview(getFileTypePreview(data.type, data.name));
    }
    
    const fileReader = new window.FileReader();
    fileReader.readAsArrayBuffer(data);
    fileReader.onloadend = () => {
      setFile(data);
    };
    setFileName(data.name);
    e.preventDefault();
  };
  
  // Helper function to categorize file types
  const getFileTypeCategory = (extension, mimeType) => {
    if (mimeType.startsWith('image/') || ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(extension)) {
      return 'image';
    } else if (mimeType.startsWith('video/') || ['mp4', 'webm', 'ogg', 'avi', 'mov', 'wmv'].includes(extension)) {
      return 'video';
    } else if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'flac'].includes(extension)) {
      return 'audio';
    } else if (extension === 'pdf' || mimeType === 'application/pdf') {
      return 'pdf';
    } else {
      return 'other';
    }
  };
  
  // Helper function to get proper preview for non-image files
  const getFileTypePreview = (fileType, fileName) => {
    // Return different preview placeholder images based on file type
    if (fileType.startsWith('application/pdf')) {
      return "/pdf-icon.png"; // Replace with actual path to PDF icon
    } else if (fileType.startsWith('video/')) {
      return "/video-icon.png"; // Replace with actual path to video icon
    } else if (fileType.startsWith('audio/')) {
      return "/audio-icon.png"; // Replace with actual path to audio icon
    } else if (fileType.includes('document') || fileType.includes('word')) {
      return "/doc-icon.png"; // Replace with actual path to document icon
    } else {
      // Default file icon
      return `https://via.placeholder.com/200x150?text=${fileName.substring(0, 15)}`;
    }
  };

  return (
    <div className="upload-container">
      <h3 className="upload-title">Upload Files to Blockchain</h3>
      
      <form className="upload-form" onSubmit={handleSubmit}>
        <div className="file-input-group">
          <label htmlFor="file-upload" className="choose">
            {uploading ? 'Uploading...' : 'Choose File'}
          </label>
          <input
            disabled={!account || uploading}
            type="file"
            id="file-upload"
            name="data"
            onChange={retrieveFile}
          />
          
          {filePreview && (
            <div className="file-preview">
              {fileType === 'image' ? (
                <img src={filePreview} alt="Selected file preview" />
              ) : fileType === 'video' ? (
                <video controls>
                  <source src={filePreview} type={file.type} />
                  Your browser does not support video playback.
                </video>
              ) : fileType === 'audio' ? (
                <audio controls>
                  <source src={filePreview} type={file.type} />
                  Your browser does not support audio playback.
                </audio>
              ) : (
                <div className="generic-preview">
                  <div className="file-icon">{fileName.split('.').pop().toUpperCase()}</div>
                  <div className="file-name-preview">{fileName}</div>
                </div>
              )}
            </div>
          )}
          
          <span className="file-name">
            <span className="label">Selected:</span> {fileName}
          </span>
        </div>
        
        <div id="upload-status" className="upload-status"></div>
        
        <button 
          type="submit" 
          className="upload" 
          disabled={!file || !account || uploading}
        >
          {uploading ? 'Processing...' : 'Upload to SAFECHAIN'}
        </button>
      </form>
      
      {!account && (
        <div className="upload-warning">
          Connect your wallet to upload files
        </div>
      )}
    </div>
  );
};

export default FileUpload;

