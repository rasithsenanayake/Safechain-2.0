const hre = require("hardhat");

async function main() {
  console.log("Deploying contract...");
  
  const Upload = await hre.ethers.getContractFactory("Upload");
  const upload = await Upload.deploy();

  await upload.deployed();

  console.log("SAFECHAIN contract deployed to:", upload.address);
  console.log("Use this address in your frontend code");
  
  // Log the network information
  const network = await hre.ethers.provider.getNetwork();
  console.log("Network:", {
    name: network.name,
    chainId: network.chainId
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
