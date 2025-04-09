import { ethers } from "ethers";

/**
 * Helper functions to manage file sharing functionality
 */

/**
 * Check if a user has access to a specific file
 * @param {Object} contract - The contract instance
 * @param {String} fileOwner - The file owner's address
 * @param {Number} fileIndex - The file index
 * @param {String} userAddress - The address to check access for
 * @returns {Promise<Boolean>} - Whether the user has access
 */
export const checkFileAccess = async (contract, fileOwner, fileIndex, userAddress) => {
  try {
    return await contract.hasFileAccess(fileOwner, fileIndex, userAddress);
  } catch (error) {
    console.error("Error checking file access:", error);
    return false;
  }
};

/**
 * Format a file object from the raw data
 * @param {String} item - The raw file data
 * @param {Number} index - The file index
 * @param {String} owner - The file owner's address
 * @param {Boolean} isShared - Whether the file is shared
 * @param {String} accessType - The type of access ("global" or "individual")
 * @returns {Object} - The formatted file object
 */
export const formatFileObject = (item, index, owner, isShared = false, accessType = null) => {
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
    owner,
    index,
    isShared,
    accessType
  };
};

/**
 * Get all files shared with a user by another user
 * @param {Object} contract - The contract instance
 * @param {String} ownerAddress - The file owner's address
 * @param {String} userAddress - The user to check shared files for
 * @returns {Promise<Array>} - Array of shared file objects
 */
export const getSharedFiles = async (contract, ownerAddress, userAddress) => {
  try {
    // Check if user has global access
    const hasGlobalAccess = await contract.hasGlobalAccess(ownerAddress, userAddress);
    
    if (hasGlobalAccess) {
      // Get all files if user has global access
      const files = await contract.display(ownerAddress);
      
      return files.map((item, index) => 
        formatFileObject(item, index, ownerAddress, true, "global")
      );
    } else {
      // Check individual files
      const fileCount = await contract.getFileCount(ownerAddress);
      const sharedFiles = [];
      
      for (let i = 0; i < fileCount; i++) {
        try {
          const hasAccess = await contract.hasFileAccess(ownerAddress, i, userAddress);
          
          if (hasAccess) {
            // User has access to this specific file
            const fileUrl = await contract.displayFile(ownerAddress, i);
            sharedFiles.push(formatFileObject(fileUrl, i, ownerAddress, true, "individual"));
          }
        } catch (error) {
          console.error(`Error checking file ${i} access:`, error);
        }
      }
      
      return sharedFiles;
    }
  } catch (error) {
    console.error("Error getting shared files:", error);
    return [];
  }
};

/**
 * Format Ethereum address for display
 * @param {String} address - Full Ethereum address
 * @returns {String} - Shortened address format
 */
export const formatAddress = (address) => {
  if (!address) return "";
  return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
};
