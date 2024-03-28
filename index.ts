import * as fs from "fs";

import {Connection, Keypair, PublicKey, sendAndConfirmTransaction, SystemProgram, Transaction} from "@solana/web3.js";
import {
    createAssociatedTokenAccountIdempotent,
    createInitializeInstruction,
    createInitializeMetadataPointerInstruction,
    createInitializeMintInstruction,
    createTransferInstruction,
    createUpdateFieldInstruction,
    ExtensionType,
    getMintLen,
    LENGTH_SIZE,
    mintTo,
    TOKEN_2022_PROGRAM_ID,
    TYPE_SIZE
} from "@solana/spl-token";
import {pack, TokenMetadata} from "@solana/spl-token-metadata";

export class NFT {
    connection: Connection;
    keypair: Keypair;
    name: string;
    symbol: string;

    constructor(address: string, privateKey: Uint8Array, name: string, symbol: string) {
        this.connection = new Connection(address);
        this.keypair = Keypair.fromSecretKey(privateKey);
        this.name = name;
        this.symbol = symbol;
    }

    async create(tag: string, data: any): Promise<string> {
        const decimals = 0;
        const mintAmount = 1;

        const mint = Keypair.generate();
        const payer = this.keypair;

        const metadata: TokenMetadata = {
            mint: mint.publicKey,
            updateAuthority: mint.publicKey,
            name: this.name,
            symbol: this.symbol,
            uri: "",
            additionalMetadata: [["tag", tag], ["data", JSON.stringify(data)]],
        };

        const mintLen = getMintLen([ExtensionType.MetadataPointer]);
        const metadataLen = TYPE_SIZE + LENGTH_SIZE + pack(metadata).length;
        const mintLamports = await this.connection.getMinimumBalanceForRentExemption(mintLen + metadataLen);

        const transaction = new Transaction().add(
            SystemProgram.createAccount({
                fromPubkey: payer.publicKey,
                newAccountPubkey: mint.publicKey,
                space: mintLen,
                lamports: mintLamports,
                programId: TOKEN_2022_PROGRAM_ID,
            }),
            createInitializeMetadataPointerInstruction(
                mint.publicKey,
                mint.publicKey,
                mint.publicKey,
                TOKEN_2022_PROGRAM_ID
            ),
            createInitializeMintInstruction(
                mint.publicKey,
                decimals,
                mint.publicKey,
                null,
                TOKEN_2022_PROGRAM_ID
            ),
            createInitializeInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                metadata: mint.publicKey,
                updateAuthority: mint.publicKey,
                mint: mint.publicKey,
                mintAuthority: mint.publicKey,
                name: metadata.name,
                symbol: metadata.symbol,
                uri: metadata.uri,
            }),
            createUpdateFieldInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                metadata: mint.publicKey,
                updateAuthority: mint.publicKey,
                field: metadata.additionalMetadata[0][0],
                value: metadata.additionalMetadata[0][1],
            }),
            createUpdateFieldInstruction({
                programId: TOKEN_2022_PROGRAM_ID,
                metadata: mint.publicKey,
                updateAuthority: mint.publicKey,
                field: metadata.additionalMetadata[1][0],
                value: metadata.additionalMetadata[1][1],
            }),
        );

        await sendAndConfirmTransaction(this.connection, transaction, [payer, mint]);
        const sourceAccount = await createAssociatedTokenAccountIdempotent(this.connection, payer, mint.publicKey, payer.publicKey, { commitment: "confirmed" }, TOKEN_2022_PROGRAM_ID);
        console.log(sourceAccount);
        await mintTo(this.connection, payer, mint.publicKey, sourceAccount, mint.publicKey, mintAmount, [mint], { commitment: "confirmed" }, TOKEN_2022_PROGRAM_ID);
        return mint.publicKey.toBase58();
    }

    async transfer(token: string, to: string) {
        const source = await createAssociatedTokenAccountIdempotent(this.connection, this.keypair, new PublicKey(token), this.keypair.publicKey, { commitment: "confirmed" }, TOKEN_2022_PROGRAM_ID);
        console.log(source);
        const destination = await createAssociatedTokenAccountIdempotent(this.connection, this.keypair, new PublicKey(token), new PublicKey(to), { commitment: "confirmed" }, TOKEN_2022_PROGRAM_ID);
        const tx = new Transaction().add(createTransferInstruction(source, destination, this.keypair.publicKey, 1, [this.keypair], TOKEN_2022_PROGRAM_ID));
        await sendAndConfirmTransaction(this.connection, tx, [this.keypair]);
    }
}


const solanaNode = process.argv[2];
const privateKeyPath = process.argv[3];

console.log(process.argv)

const privateKey = new Uint8Array(JSON.parse(fs.readFileSync(privateKeyPath).toString()));

const nft = new NFT(solanaNode, privateKey, "test", "test");

nft.create("test", ["test", "data"]).then((r: string) => {
    console.log(r);
    nft.transfer(r, "7A5h8N21EtjAnfcf8kxp7Bd7pNtQ5SvoYHLyBwz2796e").then(() => {});
});
