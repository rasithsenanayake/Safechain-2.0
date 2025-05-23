// SPDX-License-Identifier: GPL-3.0

pragma solidity >=0.7.0 <0.9.0;

/**
 * @title Upload
 * @dev This contract implements decentralized file storage with access control
 * where users can upload files, share access, and manage their files.
 */
contract Upload {
  
  /**
   * @dev Access struct defines a user and their access status for file sharing
   */
  struct Access {
     address user;    // Address of user who has been granted access
     bool access;     // Access status (true = has access, false = no access)
  }

  // Events for monitoring contract activity
  event FileAdded(address indexed user, string url);
  event AccessGranted(address indexed owner, address indexed user);
  event AccessRevoked(address indexed owner, address indexed user);
  event FileRemoved(address indexed user, uint index);
  event FilesRemoved(address indexed user, uint count);
  event FileAccessGranted(address indexed owner, address indexed user, uint indexed fileIndex);
  event FileAccessRevoked(address indexed owner, address indexed user, uint indexed fileIndex);

  // Maps a user address to an array of their file URLs
  mapping(address => string[]) value;
  
  // Maps owner address to a mapping of user addresses who have access to the owner's files
  mapping(address => mapping(address => bool)) ownership;
  
  // Maps an owner address to an array of Access structs (list of users with access)
  mapping(address => Access[]) accessList;
  
  // Tracks if a user has previously been added to an owner's access list
  mapping(address => mapping(address => bool)) previousData;

  // Mapping to track individual file access permissions: owner => fileIndex => user => hasAccess
  mapping(address => mapping(uint => mapping(address => bool))) individualFileAccess;

  // Add a state variable to track total users
  uint256 public totalUsers;
    
  // Add mapping to track if an address is a user
  mapping(address => bool) public isUser;

  /**
   * @dev Add a file URL to a user's storage
   * @param _user Address of the user who owns the file
   * @param url IPFS URL of the file
   */
  function add(address _user, string memory url) external {
      // Register new user if not already registered
      if (!isUser[_user]) {
          isUser[_user] = true;
          totalUsers++;
      }
      
      value[_user].push(url);
      emit FileAdded(_user, url);
  }

  /**
   * @dev Grant access to another user to view your files
   * @param user Address of the user to grant access
   */
  function allow(address user) external {
      // Prevent sharing with self
      require(user != msg.sender, "Cannot share with yourself");
      
      // Set ownership mapping to true (grant access)
      ownership[msg.sender][user] = true; 
      
      // Update existing access entry if user was previously in the list
      if (previousData[msg.sender][user]) {
         for (uint i = 0; i < accessList[msg.sender].length; i++) {
             if (accessList[msg.sender][i].user == user) {
                  accessList[msg.sender][i].access = true; 
             }
         }
      } else {
          // Add new entry to access list
          accessList[msg.sender].push(Access(user, true));  
          previousData[msg.sender][user] = true;  
      }
      
      emit AccessGranted(msg.sender, user);
  }

  /**
   * @dev Revoke access from a user to view your files
   * @param user Address of the user to revoke access
   */
  function disallow(address user) public {
      // Prevent operations on invalid addresses
      require(user != address(0), "Invalid address");
      
      // Set ownership mapping to false (revoke access)
      ownership[msg.sender][user] = false;
      
      // Update the access status in the access list
      for (uint i = 0; i < accessList[msg.sender].length; i++) {
          if (accessList[msg.sender][i].user == user) { 
              accessList[msg.sender][i].access = false;  
              break; // Exit loop once found
          }
      }
      
      // Also revoke all individual file access permissions
      uint fileCount = value[msg.sender].length;
      for (uint i = 0; i < fileCount; i++) {
          individualFileAccess[msg.sender][i][user] = false;
      }
      
      emit AccessRevoked(msg.sender, user);
  }

  /**
   * @dev Display files of a specific user
   * @param _user Address of the user whose files to display
   * @return Array of file URLs
   */
  function display(address _user) external view returns (string[] memory) {
      // Check if caller has access to these files
      require(_user == msg.sender || ownership[_user][msg.sender], "You don't have access");
      return value[_user];
  }

  /**
   * @dev Get list of all users who have been granted access to your files
   * @return Array of Access structs
   */
  function shareAccess() public view returns (Access[] memory) {
      return accessList[msg.sender];
  }

  /**
   * @dev Remove a single file by index
   * @param index Index of the file to remove
   */
  function removeFile(uint index) external {
      // Ensure the index is valid
      require(index < value[msg.sender].length, "Invalid index");
      
      // Shift elements to fill the gap
      for (uint i = index; i < value[msg.sender].length - 1; i++) {
          value[msg.sender][i] = value[msg.sender][i + 1];
      }
      
      // Remove the last element
      value[msg.sender].pop();
      emit FileRemoved(msg.sender, index);
  }

  /**
   * @dev Remove multiple files by their indices
   * @param indices Array of indices to remove
   */
  function removeFiles(uint[] memory indices) external {
      // Ensure there are indices provided
      require(indices.length > 0, "No indices provided");
      
      // Ensure all indices are valid
      for (uint i = 0; i < indices.length; i++) {
          require(indices[i] < value[msg.sender].length, "Invalid index");
      }

      // Calculate how many files will be left after deletion
      uint remainingFiles = value[msg.sender].length - indices.length;
      
      // Create a temporary array to store the remaining files
      string[] memory temp = new string[](remainingFiles);
      uint tempIndex = 0;

      // Copy files that are not marked for deletion to the temp array
      for (uint i = 0; i < value[msg.sender].length; i++) {
          bool toDelete = false;
          
          // Check if current index is in the indices array
          for (uint j = 0; j < indices.length; j++) {
              if (i == indices[j]) {
                  toDelete = true;
                  break;
              }
          }
          
          // If not marked for deletion, copy to temp array
          if (!toDelete) {
              temp[tempIndex] = value[msg.sender][i];
              tempIndex++;
          }
      }

      // Replace the original array with the filtered array
      value[msg.sender] = temp;
      emit FilesRemoved(msg.sender, indices.length);
  }

  /**
   * @dev Get the number of files owned by a user
   * @param owner Address of the user
   * @return uint Number of files
   */
  function getFileCount(address owner) external view returns (uint) {
      return value[owner].length;
  }

  /**
   * @dev Share a specific file with a user
   * @param user Address of the user to grant access
   * @param fileIndex Index of the file to share
   */
  function shareFile(address user, uint fileIndex) external {
      require(fileIndex < value[msg.sender].length, "Invalid file index");
      // Prevent sharing with self
      require(user != msg.sender, "Cannot share with yourself");
      
      // Grant individual file access
      individualFileAccess[msg.sender][fileIndex][user] = true;
      
      // Add to access list if not already present, but DON'T grant global access
      if (!previousData[msg.sender][user]) {
          accessList[msg.sender].push(Access(user, false)); // Note: access flag is false
          previousData[msg.sender][user] = true;
      }
      
      // Do NOT set ownership[msg.sender][user] = true since we only want file-specific access
      
      emit FileAccessGranted(msg.sender, user, fileIndex);
  }
  
  /**
   * @dev Display a specific file if the user has access to it
   * @param owner Address of the file owner
   * @param fileIndex Index of the file to display
   * @return File URL if the user has access
   */
  function displayFile(address owner, uint fileIndex) external view returns (string memory) {
      require(fileIndex < value[owner].length, "Invalid file index");
      
      // Check if user has access to this specific file
      bool hasAccess = (owner == msg.sender) || 
                       ownership[owner][msg.sender] || 
                       individualFileAccess[owner][fileIndex][msg.sender];
                       
      require(hasAccess, "You don't have access to this file");
      
      return value[owner][fileIndex];
  }

  /**
   * @dev Revoke access to a specific file from a user
   * @param user Address of the user to revoke access
   * @param fileIndex Index of the file to unshare
   */
  function revokeFileAccess(address user, uint fileIndex) external {
      require(fileIndex < value[msg.sender].length, "Invalid file index");
      
      // Revoke access to the specific file
      individualFileAccess[msg.sender][fileIndex][user] = false;
      
      emit FileAccessRevoked(msg.sender, user, fileIndex);
  }
  
  /**
   * @dev Check if a user has access to a specific file
   * @param owner Address of the file owner
   * @param fileIndex Index of the file
   * @param user Address of the user to check
   * @return boolean indicating if the user has access
   */
  function hasFileAccess(address owner, uint fileIndex, address user) external view returns (bool) {
      // Access is granted if:
      // 1. The user is the owner, OR
      // 2. The user has global access to all files, OR
      // 3. The user has been granted access to this specific file
      return (owner == user) || 
             ownership[owner][user] || 
             individualFileAccess[owner][fileIndex][user];
  }

  /**
   * @dev Check if a user has been granted global access by an owner
   * @param owner Address of the file owner
   * @param user Address of the user to check
   * @return boolean indicating if the user has global access
   */
  function hasGlobalAccess(address owner, address user) external view returns (bool) {
      return ownership[owner][user];
  }

  /**
   * @dev Get all files for a user with proper error handling
   * @param _user Address of the user whose files to get
   * @return Array of file URLs
   */
  function getUserFiles(address _user) external view returns (string[] memory) {
      require(isUser[_user], "User has no files");
      require(_user == msg.sender || ownership[_user][msg.sender], "Access denied");
      return value[_user];
  }

  /**
   * @dev Get list of all users who have granted access to the caller
   * @return Array of addresses that have shared with the caller
   */
  function getSharersWithMe() external view returns (address[] memory) {
      // First, we need to determine the number of users who have shared with us
      uint count = 0;
      for (uint i = 0; i < totalUsers; i++) {
          // Note: This is a simplified approach. In a real contract,
          // you would need a proper way to iterate through all users.
          address user = address(uint160(i + 1)); // Simple demo - not for production
          if (ownership[user][msg.sender]) {
              count++;
          }
      }
      
      // Now create and populate the array
      address[] memory sharers = new address[](count);
      uint index = 0;
      for (uint i = 0; i < totalUsers; i++) {
          address user = address(uint160(i + 1)); // Simple demo - not for production
          if (ownership[user][msg.sender]) {
              sharers[index] = user;
              index++;
          }
      }
      
      return sharers;
  }
}