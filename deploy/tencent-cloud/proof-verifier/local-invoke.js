"use strict";

const { main_handler: mainHandler } = require("./index");

const [runIdOrTxHash] = process.argv.slice(2);
const event =
  runIdOrTxHash && runIdOrTxHash.startsWith("0x")
    ? { txHash: runIdOrTxHash }
    : { runId: runIdOrTxHash || "mantle-demo-run" };

mainHandler(event)
  .then((result) => {
    console.log(result.body || JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
