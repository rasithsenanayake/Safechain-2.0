const hre = require("hardhat");

async function main() {
  const Upload = await hre.ethers.getContractFactory("Upload");
  const upload = await Upload.deploy();

  await upload.deployed();

  console.log("Contract deployed to:", upload.address);
  
  // Save the contract address to a file for frontend use
  const fs = require("fs");
  const contractAddresses = {
    Upload: upload.address
  };
  
  fs.writeFileSync(
    "./client/src/contractAddress.json",
    JSON.stringify(contractAddresses, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
