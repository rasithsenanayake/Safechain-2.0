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

  /**
   * @dev Add a file URL to a user's storage
   * @param _user Address of the user who owns the file
   * @param url IPFS URL of the file
   */
  function add(address _user, string memory url) external {
      value[_user].push(url);
      emit FileAdded(_user, url);
  }

  /**
   * @dev Grant access to another user to view your files
   * @param user Address of the user to grant access
   */
  function allow(address user) external {
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
      // Set ownership mapping to false (revoke access)
      ownership[msg.sender][user] = false;
      
      // Update the access status in the access list
      for (uint i = 0; i < accessList[msg.sender].length; i++) {
          if (accessList[msg.sender][i].user == user) { 
              accessList[msg.sender][i].access = false;  
          }
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
   * @dev Share a specific file with a user
   * @param user Address of the user to grant access
   * @param fileIndex Index of the file to share
   */
  function shareFile(address user, uint fileIndex) external {
      require(fileIndex < value[msg.sender].length, "Invalid file index");
      
      // Grant access to the specific file
      individualFileAccess[msg.sender][fileIndex][user] = true;
      
      emit FileAccessGranted(msg.sender, user, fileIndex);
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
}