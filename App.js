import React, { useState } from "react";
import {
  Connection,
  clusterApiUrl,
  PublicKey,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  Keypair,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Token, TOKEN_PROGRAM_ID } from "@solana/spl-token";
// ------------------------------------------------------------------------------------------

const App = () => {
  const getProvider = async () => {
    if ("solana" in window) {
      const provider = window.solana;
      if (provider.isPhantom) {
        return provider;
      }
    } else {
      window.open("https://www.phantom.app/", "_blank");
    }
  };
  //-------------------------------------------------------------------------------------------
  const walletConnectionHelper = async () => {
    if (walletConnected) {
      //Disconnect Wallet
      setProvider();
      setWalletConnected(false);
    } else {
      const userWallet = await getProvider();
      if (userWallet) {
        await userWallet.connect();
        userWallet.on("connect", async () => {
          setProvider(userWallet);
          setWalletConnected(true);
        });
      }
    }
  };
  //---------------------------------------------------------------------------------------------
  const airDropHelper = async () => {
    try {
      setLoading(true);
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const fromAirDropSignature = await connection.requestAirdrop(
        new PublicKey(provider.publicKey),
        LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(fromAirDropSignature, {
        commitment: "confirmed",
      });

      console.log(
        `1 SOL airdropped to your wallet ${provider.publicKey.toString()} successfully`
      );
      setLoading(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  };
  //---------------------------------------------------------------------------------------------------
  const initialMintHelper = async () => {
    try {
      setLoading(true);
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

      const mintRequester = await provider.publicKey;
      const mintingFromWallet = await Keypair.generate();
      setMintingWalletSecretKey(JSON.stringify(mintingFromWallet.secretKey));

      const fromAirDropSignature = await connection.requestAirdrop(
        mintingFromWallet.publicKey,
        LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(fromAirDropSignature, {
        commitment: "confirmed",
      });

      const creatorToken = await Token.createMint(
        connection,
        mintingFromWallet,
        mintingFromWallet.publicKey,
        null,
        6,
        TOKEN_PROGRAM_ID
      );
      const fromTokenAccount =
        await creatorToken.getOrCreateAssociatedAccountInfo(
          mintingFromWallet.publicKey
        );
      await creatorToken.mintTo(
        fromTokenAccount.address,
        mintingFromWallet.publicKey,
        [],
        1000000
      );

      const toTokenAccount =
        await creatorToken.getOrCreateAssociatedAccountInfo(mintRequester);
      const transaction = new Transaction().add(
        Token.createTransferInstruction(
          TOKEN_PROGRAM_ID,
          fromTokenAccount.address,
          toTokenAccount.address,
          mintingFromWallet.publicKey,
          [],
          1000000
        )
      );
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        [mintingFromWallet],
        { commitment: "confirmed" }
      );

      console.log("SIGNATURE:", signature);

      setCreatedTokenPublicKey(creatorToken.publicKey.toString());
      setIsTokenCreated(true);
      setLoading(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  };
  //---------------------------------------------------------------------------------------------------
  const mintAgainHelper = async () => {
    try {
      setLoading(true);
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
      const createMintingWallet = await Keypair.fromSecretKey(
        Uint8Array.from(Object.values(JSON.parse(mintingWalletSecretKey)))
      );
      const mintRequester = await provider.publicKey;

      const fromAirDropSignature = await connection.requestAirdrop(
        createMintingWallet.publicKey,
        LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(fromAirDropSignature, {
        commitment: "confirmed",
      });

      const creatorToken = new Token(
        connection,
        createdTokenPublicKey,
        TOKEN_PROGRAM_ID,
        createMintingWallet
      );
      const fromTokenAccount =
        await creatorToken.getOrCreateAssociatedAccountInfo(
          createMintingWallet.publicKey
        );
      const toTokenAccount =
        await creatorToken.getOrCreateAssociatedAccountInfo(mintRequester);
      await creatorToken.mintTo(
        fromTokenAccount.address,
        createMintingWallet.publicKey,
        [],
        100000000
      );

      const transaction = new Transaction().add(
        Token.createTransferInstruction(
          TOKEN_PROGRAM_ID,
          fromTokenAccount.address,
          toTokenAccount.address,
          createMintingWallet.publicKey,
          [],
          100000000
        )
      );
      await sendAndConfirmTransaction(
        connection,
        transaction,
        [createMintingWallet],
        { commitment: "confirmed" }
      );

      setLoading(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  };
  //----------------------------------------------------------------------------------------------------
  const transferTokenHelper = async () => {
    try {
      setLoading(true);

      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

      const createMintingWallet = Keypair.fromSecretKey(
        Uint8Array.from(Object.values(JSON.parse(mintingWalletSecretKey)))
      );
      const receiverWallet = new PublicKey(
        "9oTSnJXD1VsLX6Ug9B7vaJ2JBoYki3yUPT5tfGVexsYC"
      );

      const fromAirDropSignature = await connection.requestAirdrop(
        createMintingWallet.publicKey,
        LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(fromAirDropSignature, {
        commitment: "confirmed",
      });
      console.log("1 SOL airdropped to the wallet for fee");

      const creatorToken = new Token(
        connection,
        createdTokenPublicKey,
        TOKEN_PROGRAM_ID,
        createMintingWallet
      );
      const fromTokenAccount =
        await creatorToken.getOrCreateAssociatedAccountInfo(provider.publicKey);
      const toTokenAccount =
        await creatorToken.getOrCreateAssociatedAccountInfo(receiverWallet);

      const transaction = new Transaction().add(
        Token.createTransferInstruction(
          TOKEN_PROGRAM_ID,
          fromTokenAccount.address,
          toTokenAccount.address,
          provider.publicKey,
          [],
          10000000
        )
      );
      transaction.feePayer = provider.publicKey;
      let blockhashObj = await connection.getRecentBlockhash();
      console.log("blockhashObj", blockhashObj);
      transaction.recentBlockhash = await blockhashObj.blockhash;

      if (transaction) {
        console.log("Txn created successfully");
      }

      let signed = await provider.signTransaction(transaction);
      let signature = await connection.sendRawTransaction(signed.serialize());
      await connection.confirmTransaction(signature);

      console.log("SIGNATURE: ", signature);
      setLoading(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  };
  //---------------------------------------------------------------------------------------------------
  const capSupplyHelper = async () => {
    try {
      setLoading(true);
      const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

      const createMintingWallet = await Keypair.fromSecretKey(
        Uint8Array.from(Object.values(JSON.parse(mintingWalletSecretKey)))
      );
      const fromAirDropSignature = await connection.requestAirdrop(
        createMintingWallet.publicKey,
        LAMPORTS_PER_SOL
      );
      await connection.confirmTransaction(fromAirDropSignature);

      const creatorToken = new Token(
        connection,
        createdTokenPublicKey,
        TOKEN_PROGRAM_ID,
        createMintingWallet
      );
      await creatorToken.setAuthority(
        createdTokenPublicKey,
        null,
        "MintTokens",
        createMintingWallet.publicKey,
        [createMintingWallet]
      );

      setSupplyCapped(true);
      setLoading(false);
    } catch (err) {
      console.log(err);
      setLoading(false);
    }
  };
  //----------------------------------------------------------------------------------------------------
  const [walletConnected, setWalletConnected] = useState(false);
  const [provider, setProvider] = useState();
  const [loading, setLoading] = useState();

  const [isTokenCreated, setIsTokenCreated] = useState(false);
  const [createdTokenPublicKey, setCreatedTokenPublicKey] = useState(null);
  const [mintingWalletSecretKey, setMintingWalletSecretKey] = useState(null);
  const [supplyCapped, setSupplyCapped] = useState(false);
  //----------------------------------------------------------------------------------------------------
  return (
    <div>
      <h1>Create your own token using JavaScript</h1>
      {/* ---- --------------------------------------------------------------------------*/}
      {walletConnected ? (
        <p>
          <strong>Public Key:</strong> {provider.publicKey.toString()}
        </p>
      ) : (
        <p></p>
      )}

      <button onClick={walletConnectionHelper} disabled={loading}>
        {!walletConnected ? "Connect Wallet" : "Disconnect Wallet"}
      </button>
      {/* ---- --------------------------------------------------------------------------*/}
      {walletConnected ? (
        <p>
          Airdrop 1 SOL into your wallet
          <button disabled={loading} onClick={airDropHelper}>
            AirDrop SOL{" "}
          </button>
        </p>
      ) : (
        <></>
      )}
      {/* ---- --------------------------------------------------------------------------*/}
      {walletConnected ? (
        <p>
          Create your own token
          <button disabled={loading} onClick={initialMintHelper}>
            Initial Mint{" "}
          </button>
        </p>
      ) : (
        <></>
      )}
      {/* ---- --------------------------------------------------------------------------*/}
      <li>
        Mint More 100 tokens:{" "}
        <button disabled={loading || supplyCapped} onClick={mintAgainHelper}>
          Mint Again
        </button>
      </li>
      {/* ---- --------------------------------------------------------------------------*/}
      <li>
        Transfer Tokens to friends:{" "}
        <button disabled={loading} onClick={transferTokenHelper}>
          Transfer 10 tokens
        </button>
      </li>
      {/* ---- --------------------------------------------------------------------------*/}
      <li>
        cap token supply:{" "}
        <button disabled={loading} onClick={capSupplyHelper}>
          Cap token supply
        </button>
      </li>
    </div>
  );
};

export default App;