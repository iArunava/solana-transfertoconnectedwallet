
// import functionalities
import React from 'react';
import './App.css';
import {
  Connection,
  PublicKey,
  Transaction,
  clusterApiUrl,
  Keypair,
  LAMPORTS_PER_SOL,
  SystemProgram,
  sendAndConfirmRawTransaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {useEffect , useState } from "react";
import { Buffer } from 'buffer';
import './App.css'

// create types
type DisplayEncoding = "utf8" | "hex";

type PhantomEvent = "disconnect" | "connect" | "accountChanged";
type PhantomRequestMethod =
  | "connect"
  | "disconnect"
  | "signTransaction"
  | "signAllTransactions"
  | "signMessage";

interface ConnectOpts {
  onlyIfTrusted: boolean;
}

// create a provider interface (hint: think of this as an object) to store the Phantom Provider
interface PhantomProvider {
  publicKey: PublicKey | null;
  isConnected: boolean | null;
  signTransaction: (transaction: Transaction) => Promise<Transaction>;
  signAllTransactions: (transactions: Transaction[]) => Promise<Transaction[]>;
  signMessage: (
    message: Uint8Array | string,
    display?: DisplayEncoding
  ) => Promise<any>;
  connect: (opts?: Partial<ConnectOpts>) => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  on: (event: PhantomEvent, handler: (args: any) => void) => void;
  request: (method: PhantomRequestMethod, params: any) => Promise<unknown>;
}

 /**
 * @description gets Phantom provider, if it exists
 */
 const getProvider = (): PhantomProvider | undefined => {
  if ("solana" in window) {
    // @ts-ignore
    const provider = window.solana as any;
    if (provider.isPhantom) return provider as PhantomProvider;
  }
};

export default function App() {
  // create state variable for the provider
  const [provider, setProvider] = useState<PhantomProvider | undefined>(
    undefined
  );

	// create state variable for the wallet key
  const [walletKey, setWalletKey] = useState<PhantomProvider | undefined>(
  undefined
  );

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  //const [newPublicKey, setNewPublicKey] = useState('');
  var newPublicKey = '';
  var newPair = '';

  // this is the function that runs whenever the component updates (e.g. render, refresh)
  useEffect(() => {
	  const provider = getProvider();

		// if the phantom provider exists, set this as the provider
	  if (provider) setProvider(provider);
	  else setProvider(undefined);
  }, []);

  /**
   * @description prompts user to connect wallet if it exists.
	 * This function is called when the connect wallet button is clicked
   */
  const connectWallet = async () => {
    // @ts-ignore
    const { solana } = window;

		// checks if phantom wallet exists
    if (solana) {
      try {
				// connects wallet and returns response which includes the wallet public key
        const response = await solana.connect();
        console.log('wallet account ', response.publicKey.toString());
				// update walletKey to be the public key
        setWalletKey(response.publicKey.toString());
      } catch (err) {
      // { code: 4001, message: 'User rejected the request.' }
      }
    }
  };

  /**
	 * @description gets the latest block and confirms the transaction
	 * @param signature transaction to be confirmed
	 */
		const confirmTxn = async (signature: string) => {
				let latestBlockHash = await connection.getLatestBlockhash();
				await connection.confirmTransaction({
						blockhash: latestBlockHash.blockhash,
						lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
						signature: signature
				});
			 }

  /**
   * @description prompts user to connect wallet if it exists.
	 * This function is called when the connect wallet button is clicked
   */
  const createNewWallet = async () => {
    // @ts-ignore
    const { solana } = window;

		// checks if phantom wallet exists
    if (solana) {
        newPair = new Keypair();
        // Exact the public and private key from the keypair
        //useEffect(() => { setNewPublicKey(new PublicKey(newPair._keypair.publicKey).toString()) }, [])
        //await setNewPublicKey(new PublicKey(newPair._keypair.publicKey).toString());
        newPublicKey = new PublicKey(newPair._keypair.publicKey).toString();
        const privateKey = newPair._keypair.secretKey;

        console.log('Public Key of the KeyPair created: ' + newPublicKey)


        try {
        // Connect to the Devnet and make a wallet from privateKey
        const myWallet = await Keypair.fromSecretKey(privateKey);

        // Request airdrop of 2 SOL to the wallet
        console.log("Airdropping some SOL to my wallet!");
        const fromAirDropSignature = await connection.requestAirdrop(
								new PublicKey(myWallet.publicKey),
								2 * LAMPORTS_PER_SOL
				);
				await connection.confirmTransaction(fromAirDropSignature);
				} catch (err) {
						console.log(err);
				}

    }
  };

  /**
   * @description prompts user to connect wallet if it exists.
	 * This function is called when the connect wallet button is clicked
   */
  const transferToWallet = async () => {
    // @ts-ignore
    const { solana } = window;
    window.Buffer = Buffer;

		// checks if phantom wallet exists
    if (solana) {
      console.log('from: ', newPublicKey, ' to: ', walletKey)
      try {
          var receiver = new PublicKey(walletKey)
          var transaction = new Transaction().add(
					SystemProgram.transfer({
							fromPubkey: new PublicKey(newPublicKey),
							toPubkey: receiver,
							lamports: LAMPORTS_PER_SOL * 2
					   })
					);
					transaction.feePayer = receiver;
          let latestBlockHash = await connection.getLatestBlockhash();
          transaction.recentBlockhash = latestBlockHash.blockhash;

					// Sign transaction
          /* 
          // This will result in signature failure, as cause the feePayer is the receiver
          // they also need to sign the transaction
					var signature = await sendAndConfirmTransaction(
							connection,
							transaction,
							[newPair]
					);*/
          const signed = await provider.signTransaction(transaction!);
          signed.partialSign(newPair);
          const signature = await connection.sendRawTransaction(signed.serialize());
          await confirmTxn(signature);

      } catch (err) {
         //{ code: 4001, message: 'User rejected the request.' };
         console.log(err);
      }
    }
  };

	// HTML code for the app
  return (
    <div className="App">
      <header className="App-header">
        <h2>Connect to Phantom Wallet</h2>
      {provider && !walletKey && (
      <button
        style={{
          fontSize: "16px",
          padding: "15px",
          fontWeight: "bold",
          borderRadius: "5px",
        }}
        onClick={connectWallet}
      >
        Connect Wallet
      </button>
        )}
        {provider && walletKey && <p>Connected account</p> }

        {provider && walletKey && (
            <button
              style={{
                fontSize: "16px",
                padding: "15px",
                fontWeight: "bold",
                borderRadius: "5px",
              }}
              onClick={createNewWallet}
            >
              Create New Solana Wallet
            </button>
        )}
        <br/> <br/>
        {provider && walletKey && (
          <button
            style={{
              fontSize: "16px",
              padding: "15px",
              fontWeight: "bold",
              borderRadius: "5px",
            }}
            onClick={transferToWallet}
          >
            Transfer to New Wallet
          </button>
        )}

        {!provider && (
          <p>
            No provider found. Install{" "}
            <a href="https://phantom.app/">Phantom Browser extension</a>
          </p>
        )}
        </header>
    </div>
  );
}
