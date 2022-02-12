const ONE_VOTE_CFX = 1000;

// TODO need switch between testnet and mainnet
const poolAddress = '0x8e38f187da01d54936142a5f209d05c7e85fadff';

const confluxClient = new TreeGraph.Conflux({
  url: 'https://net8888cfx.confluxrpc.com',
  networkId: 8888
});

const appClient = new TreeGraph.Conflux({
  url: 'https://net8888cfx.confluxrpc.com',
  networkId: 8888
});

// set confluxClient provider to wallet provider
if (conflux) {
  confluxClient.provider = conflux;
}

const poolContract = confluxClient.Contract({
  abi: PoSPoolABI,
  address: poolAddress,
});

// trim 
function trimPoints(str) {
  let a = str.split('.');
  if (a.length != 2) {
    return str;
  }
  return `${a[0]}.${a[1].substr(0, 4)}`;
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
