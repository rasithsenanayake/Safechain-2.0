/**
 * Utility functions for interacting with the smart contract
 */

/**
 * Safely share a file with a user
 * Checks if the user already has access before attempting to share
 * 
 * @param {Object} contract - The smart contract instance
 * @param {string} address - The address to share with
 * @param {number} fileIndex - The index of the file to share
 * @param {Function} statusCallback - Optional callback to update status
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const safeShareFile = async (contract, address, fileIndex, statusCallback = null) => {
  try {
    // Check if user already has file access
    if (statusCallback) statusCallback("Checking current access...");
    const sharedUsers = await contract.getFileSharedUsers(fileIndex);
    if (sharedUsers.includes(address)) {
      return { success: true, message: "User already has access to this file" };
    }
    
    // Check if user has general access
    if (statusCallback) statusCallback("Checking general access...");
    const accessList = await contract.shareAccess();
    const hasGeneralAccess = accessList.some(item => 
      item.user.toLowerCase() === address.toLowerCase() && item.access
    );
    
    // Grant general access if needed
    if (!hasGeneralAccess) {
      if (statusCallback) statusCallback("Granting general access...");
      const allowTx = await contract.allow(address);
      await allowTx.wait();
    }
    
    // Share the specific file
    if (statusCallback) statusCallback("Sharing file...");
    const shareTx = await contract.shareFile(address, fileIndex);
    await shareTx.wait();
    
    return { success: true, message: "File shared successfully" };
  } catch (error) {
    console.error("Error in safeShareFile:", error);
    return { 
      success: false, 
      message: "Failed to share file", 
      error 
    };
  }
};

/**
 * Safely revoke file access from a user
 * 
 * @param {Object} contract - The smart contract instance
 * @param {string} address - The address to revoke access from
 * @param {number} fileIndex - The index of the file
 * @param {Function} statusCallback - Optional callback to update status
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export const safeRevokeFileAccess = async (contract, address, fileIndex, statusCallback = null) => {
  try {
    if (statusCallback) statusCallback("Checking current access...");
    const sharedUsers = await contract.getFileSharedUsers(fileIndex);
    
    if (!sharedUsers.includes(address)) {
      return { success: true, message: "User does not have access to this file" };
    }
    
    if (statusCallback) statusCallback("Revoking file access...");
    const tx = await contract.revokeFileAccess(address, fileIndex);
    await tx.wait();
    
    return { success: true, message: "File access revoked successfully" };
  } catch (error) {
    console.error("Error in safeRevokeFileAccess:", error);
    return { 
      success: false, 
      message: "Failed to revoke file access", 
      error 
    };
  }
};

/**
 * Get all files shared with a specific address
 * 
 * @param {Object} contract - The smart contract instance 
 * @param {string} address - The address to check
 * @returns {Promise<Array>} - Array of file indices shared with the address
 */
export const getFilesSharedWithAddress = async (contract, address) => {
  try {
    return await contract.getFilesSharedWithAddress(address);
  } catch (error) {
    console.error("Error getting files shared with address:", error);
    return [];
  }
};
