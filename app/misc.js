const ONE_VOTE_CFX = 1000;

const MAINNET_POOL_ADDRESS = '';
const NET8888_POOL_ADDRESS = '0x8e38f187da01d54936142a5f209d05c7e85fadff';
const TESTNET_POOL_ADDRESS = '0x820e8a21ba781389f5715c7a04dba9847cfccb64';

const MAINNET_URL = 'https://main.confluxrpc.com';
const TESTNET_URL = 'https://test.confluxrpc.com';
const NET8888_URL = 'https://net8888cfx.confluxrpc.com';

// const TESTNET_POS_ADDRESS = '0x9b63065c12300b32308ca18022178c1032544e07ffe2821c948c2d31fc5e200a';

const MAINNET_NET_ID = 1029;
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

function requestAccounts() {
  if (conflux.isFluent) {
    return conflux.request({
      method: "cfx_requestAccounts"
    });
  } else {
    return conflux.send("cfx_requestAccounts");
  } 
}

const Units = [{
  name: 'T',
  exp: 30,
}, {
  name: 'G',
  exp: 27,
}, {
  name: 'M',
  exp: 24,
}, {
  name: 'K',
  exp: 21,
}, {
  name: 'CFX',
  exp: 18,
}, {
  name: 'mCFX',
  exp: 15,
}, {
  name: 'uCFX',
  exp: 12,
}, {
  name: 'GDrip',
  exp: 9,
}, {
  name: 'MDrip',
  exp: 6,
}, {
  name: 'KDrip',
  exp: 3,
}, {
  name: 'Drip',
  exp: 0,
}];

const TEN = new Big(10);

// use big.js to format
function prettyFormat(value) {
  const bigValue = new Big(value);
  for (let i = 0; i < Units.length; i++) {
    const toCompare = TEN.pow(Units[i].exp);
    if (bigValue.gte(toCompare)) {
      return `${bigValue.div(toCompare).toFixed(4)} ${Units[i].name}`;
    }
  }
}

function formatUnit(value, unitName) {
  const bigValue = new Big(value);
  for (let i = 0; i < Units.length; i++) {
    if (Units[i].name === unitName) {
      return `${bigValue.div(TEN.pow(Units[i].exp)).toFixed(4)} ${unitName}`;
    }
  }
  return value;
}
