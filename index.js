"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var fs = require("fs");
var nft_1 = require("./nft");
var solanaNode = process.argv[3];
var privateKeyPath = process.argv[4];
var privateKey = new Uint8Array(JSON.parse(fs.readFileSync(privateKeyPath).toString()));
var nft = new nft_1.NFT(solanaNode, privateKey, "test", "test");
nft.create("test", ["test", "data"]).then(function () { });
