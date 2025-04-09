import { ethers } from "ethers";

/**
 * Helper functions to fetch and manage shared files
 */

/**
 * Get all addresses that have shared files with the current user
 * @param {Object} contract - The smart contract instance
 * @param {String} currentUserAddress - Current user's ethereum address
 * @returns {Promise<Array>} - Array of addresses that have shared with current user
 */
export const getSharersAddresses = async (contract, currentUserAddress) => {
  try {
    // Get all users who might have shared with current user
    // This implementation is a placeholder - we need a more efficient way to discover users
    const sharers = [];
    
    // Get users from events (if your contract emits events when sharing)
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const accessGrantedFilter = contract.filters.AccessGranted(null, currentUserAddress);
    
    // Get events from the last 10000 blocks or use another reasonable range
    const currentBlock = await provider.getBlockNumber();
    const fromBlock = Math.max(0, currentBlock - 10000);
    const events = await contract.queryFilter(accessGrantedFilter, fromBlock, "latest");
    
    // Extract unique sharer addresses from events
    events.forEach(event => {
      const sharerAddress = event.args.owner;
      if (!sharers.includes(sharerAddress)) {
        sharers.push(sharerAddress);
      }
    });
    
    return sharers;
  } catch (error) {
    console.error("Error getting sharers addresses:", error);
    return [];
  }
};

/**
 * Check if user has access to another user's files
 * @param {Object} contract - The smart contract instance
 * @param {String} ownerAddress - File owner's address
 * @param {String} userAddress - Address to check access for
 * @returns {Promise<Boolean>} - True if user has access
 */
export const checkAccess = async (contract, ownerAddress, userAddress) => {
  try {
    return await contract.hasGlobalAccess(ownerAddress, userAddress);
  } catch (error) {
    console.error("Error checking access:", error);
    return false;
  }
};

/**
 * Get all shared files from a specific owner
 * @param {Object} contract - The smart contract instance
 * @param {String} ownerAddress - File owner's address
 * @returns {Promise<Array>} - Array of file objects
 */
export const getSharedFilesFromOwner = async (contract, ownerAddress) => {
  try {
    const files = await contract.display(ownerAddress);
    
    // Format files
    return files.map((item, index) => {
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
        owner: ownerAddress,
        index,
        isShared: true
      };
    });
  } catch (error) {
    console.error(`Error getting files from ${ownerAddress}:`, error);
    return [];
  }
};

/**
 * Get all shared files for current user
 * @param {Object} contract - The smart contract instance
 * @param {String} currentUserAddress - Current user's address
 * @returns {Promise<Array>} - Array of all shared file objects
 */
export const getAllSharedFiles = async (contract, currentUserAddress) => {
  try {
    const sharers = await getSharersAddresses(contract, currentUserAddress);
    let allSharedFiles = [];
    
    // For each sharer, get their shared files
    for (const sharerAddress of sharers) {
      const hasAccess = await checkAccess(contract, sharerAddress, currentUserAddress);
      
      if (hasAccess) {
        const sharedFiles = await getSharedFilesFromOwner(contract, sharerAddress);
        allSharedFiles = [...allSharedFiles, ...sharedFiles];
      }
    }
    
    return allSharedFiles;
  } catch (error) {
    console.error("Error getting all shared files:", error);
    return [];
  }
};
