const ONE_VOTE_CFX = 1000;

const NET8888_POOL_ADDRESS = '0x8e38f187da01d54936142a5f209d05c7e85fadff';
const TESTNET_POOL_ADDRESS = '0x820e8a21ba781389f5715c7a04dba9847cfccb64';

const TESTNET_URL = 'https://test.confluxrpc.com';
const NET8888_URL = 'https://net8888cfx.confluxrpc.com';

const TESTNET_NET_ID = 1;
const NET8888_NET_ID = 8888;

function trimPoints(str) {
  const parts = str.split('.');
  if (parts.length != 2) {
    return str;
  }
  return `${parts[0]}.${parts[1].substr(0, 4)}`;
}

function voteToCFX(vote) {
  return BigInt(vote.toString()) * BigInt(ONE_VOTE_CFX);
}

function paddingZero(value) {
  return value < 10 ? `0${value}` : value;
}

function formatDateTime(date) {
  return `${date.getFullYear()}-${paddingZero(date.getMonth() + 1)}-${paddingZero(date.getDate())} ${paddingZero(date.getHours())}:${paddingZero(date.getMinutes())}:${paddingZero(date.getSeconds())}`;
}
