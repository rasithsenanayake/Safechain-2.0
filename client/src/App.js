import Upload from "./artifacts/contracts/Upload.sol/Upload.json";
import { useState, useEffect } from "react";
import { ethers } from "ethers";
import FileUpload from "./components/FileUpload";
import Display from "./components/Display";
import Modal from "./components/Modal";
import Header from "./components/Header";
import TabSelector from "./components/TabSelector";
import "./App.css";

function App() {
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("myFiles"); // New state for tab selection
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Trigger for refreshing files

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const connectWallet = async () => {
    try {
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = provider.getSigner();
      const address = await signer.getAddress();
      setAccount(address);
      
      let contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
      const contract = new ethers.Contract(
        contractAddress,
        Upload.abi,
        signer
      );
      
      setContract(contract);
      setProvider(provider);
    } catch (error) {
      console.error("Error connecting wallet:", error);
    }
  };

  const disconnectWallet = () => {
    setAccount("");
    setContract(null);
    setProvider(null);
  };

  useEffect(() => {
    if (window.ethereum) {
      // Listen for chain changes
      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });

      // Listen for account changes
      window.ethereum.on("accountsChanged", async (accounts) => {
        if (accounts.length > 0) {
          const provider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = provider.getSigner();
          const address = await signer.getAddress();
          setAccount(address);

          let contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Fixed contract address
          const contract = new ethers.Contract(
            contractAddress,
            Upload.abi,
            signer
          );

          setContract(contract);
          setProvider(provider);
          triggerRefresh(); // Refresh files when account changes
        } else {
          disconnectWallet();
        }
      });
    }
  }, []);

  useEffect(() => {
    // Auto connect if previously connected
    const autoConnect = async () => {
      if (window.ethereum) {
        try {
          await connectWallet();
        } catch (error) {
          console.log("No auto-connection");
        }
      }
    };
    
    autoConnect();
  }, []);

  return (
    <div className="App">
      <Header 
        account={account} 
        connectWallet={connectWallet} 
        disconnectWallet={disconnectWallet}
        setModalOpen={setModalOpen}
        provider={provider}
      />
      
      {modalOpen && (
        <Modal setModalOpen={setModalOpen} contract={contract}></Modal>
      )}

      <main className="app-content">
        
        {!account ? (
          <div className="connect-prompt">
            <p>Please connect your wallet to use SAFECHAIN</p>
            <button className="connect-button" onClick={connectWallet}>Connect Wallet</button>
          </div>
        ) : (
          <>
            <FileUpload
              account={account}
              provider={provider}
              contract={contract}
              triggerRefresh={triggerRefresh}
            />
            
            <TabSelector 
              activeTab={activeTab} 
              setActiveTab={setActiveTab} 
            />
            
            <Display 
              contract={contract} 
              account={account} 
              activeTab={activeTab}
              refreshTrigger={refreshTrigger}
            />
          </>
        )}
      </main>
    </div>
  );
}

export default App;
