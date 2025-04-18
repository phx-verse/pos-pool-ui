const MAINNET = {
  url: 'https://main.confluxrpc.com',
  networkId: 1029,
  poolAddress: 'cfx:acdj1y1r00mzvuw9s831rj1t5amst2405jv582syu0',
  scanURL: 'https://confluxscan.org',
  nftAddress: 'cfx:acaemjexx8xx33n9s9jndmyz2871e90x4jw3zfyphy',
  eSpaceAddress: '0x3cbc6F7D406fe9701573FE6DdF28f4F17b5d46A3',
  eSpaceRpc: 'https://evm.confluxrpc.com',
  eNetId: 1030,
};

const TESTNET = {
  url: 'https://test.confluxrpc.com',
  networkId: 1,
  poolAddress: '0x8d205f5eaeefd422fb97d04db8755f99e45b5a4a',
  scanURL: 'https://testnet.confluxscan.org',
  nftAddress: 'cfxtest:achnjxz9rhvct9gsu87n54yept6zn9znt2mem6nmva',
  eSpaceAddress: '0x90E66Bac7DB5c7E8311Cc245530A36E7fe5EBC03',
  eSpaceRpc: 'https://evmtestnet.confluxrpc.com',
  eNetId: 71,
}

/* const TESTNET = {
  url: 'https://net8888cfx.confluxrpc.com',
  networkId: 8888,
  poolAddress: '0x8e38f187da01d54936142a5f209d05c7e85fadff',
  scanURL: 'https://net8888cfx.confluxscan.net',
  nftAddress: "",
  eSpaceAddress: '0x295b281c3Ee3382C48f01E7bec841d85981cB7a3',
  eSpaceRpc: 'http://net8889eth.confluxrpc.com',
  eNetId: 8889,
} */

let CURRENT = MAINNET;

const spaceStore = Vue.reactive({
  value: 'Core'
});

const configStore = Vue.reactive({
  value: CURRENT,  // 默认值
});

const navbarOption = {
  data() {
    return {
      space: spaceStore,
      config: configStore,
    }
  },

  methods: {
    changeSpace(space) {
      this.space.value = space;
    }
  }
};

Vue.createApp(navbarOption).mount('#navbar');