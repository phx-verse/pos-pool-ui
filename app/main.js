const MAINNET = {
  url: 'https://main.confluxrpc.com',
  networkId: 1029,
  poolAddress: 'cfx:acdj1y1r00mzvuw9s831rj1t5amst2405jv582syu0',
  scan: 'https://confluxscan.io',
  nftAddress: 'cfx:acaemjexx8xx33n9s9jndmyz2871e90x4jw3zfyphy',
};

const TESTNET = {
  url: 'https://test.confluxrpc.com',
  networkId: 1,
  poolAddress: '0x820e8a21ba781389f5715c7a04dba9847cfccb64',
  scan: 'https://testnet.confluxscan.io',
  nftAddress: 'cfxtest:achnjxz9rhvct9gsu87n54yept6zn9znt2mem6nmva',
}

/* const NET8888 = {
  url: 'https://net8888cfx.confluxrpc.com',
  networkId: 8888,
  poolAddress: '0x8e38f187da01d54936142a5f209d05c7e85fadff',
  scan: '',
  nftAddress: ""
} */

let currentChainId = MAINNET.networkId;
let poolAddress = MAINNET.poolAddress;
let nftAddress = MAINNET.nftAddress;
let scanUrl = MAINNET.scan;

let confluxClient = new TreeGraph.Conflux(MAINNET);
// use wallet provider
if (window.conflux) {
  confluxClient.provider = window.conflux;
}

// used for send pos RPC methods
let appClient = new TreeGraph.Conflux(MAINNET);

console.log('SDK version: ', confluxClient.version);

let hashModal = new bootstrap.Modal(document.getElementById('hashModal'), {});
let withdrawModal = new bootstrap.Modal(document.getElementById('withdrawModal'), {});

const PoSPool = {
  data() {
    return {
      chainStatus: {},
      poolInfo: {
        // status: 'Good', // TODO load the real pool status
        status: {},
        name: '',
        totalLocked: 0,
        totalRevenue: 0,
        userShareRatio: 0,
        apy: 0,
        lastRewardTime: 0,
        stakerNumber: '0',
        posAddress: '',
        inCommittee: false,
      },
      userInfo: {
        balance: 0,
        connected: false,
        userStaked: BigInt(0),
        available: BigInt(0),
        userInterest: 0,
        account: '',
        locked: BigInt(0),
        unlocked: BigInt(0),
        userInQueue: [],
        userOutOueue: [],
        nftCount: 0,
      },
      stakeCount: 0,
      unstakeCount: 0,
      txhash: '',
    }
  },

  async created() {
    const status = await this.loadChainInfo();

    if (status.chainId !=  currentChainId) {
      if (status.chainId === TESTNET.networkId) {
        confluxClient = new TreeGraph.Conflux(TESTNET);
        confluxClient.provider = window.conflux;
        appClient = new TreeGraph.Conflux(TESTNET);
        poolAddress = TESTNET.poolAddress;
        nftAddress = TESTNET.nftAddress;
        scanUrl = TESTNET.scan;
      }
      currentChainId = status.chainId;
    }
    
    this.poolContract = confluxClient.Contract({
      abi: PoSPoolABI,
      address: poolAddress,
    });

    this.nftContract = confluxClient.Contract({
      abi: PoSNFTABI,
      address: nftAddress
    });
    
    // load pool info
    
    this.loadPoolInfo();
    this.loadLastRewardInfo();
    await this.loadPoolMetaInfo();
    this.loadPosNodeStatus();

    // auto connect user
    if (window.conflux && localStorage.getItem('userConnected')) {
      await this._requestAccount();
    }

    this.loadRewardData();
  },

  mounted () {
    // toggle visibility of the app element
    const app = document.getElementById('app');
    app.setAttribute('class', 'container');
  },

  computed: {
    perFee() {
      return (BigInt(10000) - BigInt(this.poolInfo.userShareRatio)) / BigInt(100);
    },

    formatedTotalLocked() {
      return formatUnit(this.poolInfo.totalLocked.toString(), "CFX");
    },

    formatedTotalRevenue() {
      return formatUnit(this.poolInfo.totalRevenue.toString(), "CFX");
    },

    prettyTotalLocked() {
      const totalLocked = this.poolInfo.totalLocked;
      if (totalLocked === 0) return 0;
      return prettyFormat(totalLocked.toString());
    },

    prettyTotalRevenue() {
      const totalRevenue = this.poolInfo.totalRevenue;
      if (totalRevenue == 0) return 0;
      return prettyFormat(totalRevenue.toString());
    },

    userStakedCFX() {
      return this.userInfo.userStaked * BigInt(ONE_VOTE_CFX);
    },

    unstakeableCFX() {
      return this.userInfo.locked * BigInt(ONE_VOTE_CFX);
    },

    withdrawableCFX() {
      return this.userInfo.unlocked * BigInt(ONE_VOTE_CFX);
    },

    shortenAccount() {
      return TreeGraph.address.shortenCfxAddress(this.userInfo.account);
    },

    lastRewardTime() {
      const lastTime = new Date(this.poolInfo.lastRewardTime * 1000);
      return formatDateTime(lastTime);
    },

    shortPosAddress() {
      if (!this.poolInfo.posAddress) {
        return 'Loading...';
      }
      const start = this.poolInfo.posAddress.slice(0, 6);
      return `${start}...`;
    },

    posAddressLink() {
      return `${scanUrl}/pos/accounts/${this.poolInfo.posAddress}`;
    },

    shortHash() {
      if (!this.txhash) return '';
      return this.txhash.slice(0, 10) + '...';
    },

    txScanLink() {
      if (!this.txhash) return '#';
      return `${scanUrl}/transaction/${this.txHash}`;
    },

    vip() {
      const available = this.userInfo.available;
      if (available >= 1000) { // VIP4(100w) 2%
        return 4;
      } else if (available >= 100) { // VIP3(10w) 3%
        return 3;
      } else if (available >= 50){ // VIP2(5w) 4%
        return 2;
      } else if (available >= 10) { // VIP1(1w) 5%
        return 1;
      } else {
        return 0;
      }
    }
  },

  methods: {

    async loadChainInfo() {
      const status = await confluxClient.cfx.getStatus();
      this.chainStatus = status;
      return status;
    },

    async connectWallet() {
      if (!window.conflux) {
        alert('Please install Conflux Wallet');
        return;
      }
      // const accounts = await conflux.send("cfx_requestAccounts");
      const account = await this._requestAccount();
      if (!account) {
        alert('Request account failed');
      } else {
        localStorage.setItem('userConnected', true);
      }

    },

    async _requestAccount() {
      const accounts = await requestAccounts();
      const account = accounts[0];
      if (!account) return null;
      this.userInfo.account = account;
      this.userInfo.connected = true;
      this.loadUserInfo();
      await this.loadLockingList();
      await this.loadUnlockingList();
      await this.loadNFTInfo();
      return account;
    },

    mapQueueItem(item) {
      let now = new Date().getTime();
      let unlockBlockNumber = Number(item[1].toString()) - this.chainStatus.blockNumber;
      let unlockTime = new Date(now + unlockBlockNumber / 2 * 1000);
      return {
        amount: voteToCFX(item[0]),
        endTime: formatDateTime(unlockTime),
      }
    },

    async loadUserInfo() {
      const userSummary = await this.poolContract.userSummary(this.userInfo.account);
      this.userInfo.userStaked = BigInt(userSummary[0].toString());
      this.userInfo.available = BigInt(userSummary[1].toString());
      this.userInfo.locked = BigInt(userSummary[2].toString());
      this.userInfo.unlocked = BigInt(userSummary[3].toString());
      // this.userInfo.userInterest = TreeGraph.Drip(userSummary[5].toString()).toCFX();
      const userInterest = await this.poolContract.userInterest(this.userInfo.account);
      this.userInfo.userInterest = trimPoints(TreeGraph.Drip(userInterest.toString()).toCFX());

      const balance = await confluxClient.cfx.getBalance(this.userInfo.account);
      this.userInfo.balance = trimPoints(TreeGraph.Drip(balance).toCFX());
    },

    // only need load once
    async loadPoolMetaInfo() {
      // this.poolInfo.name = await this.poolContract.poolName();
      this.poolInfo.userShareRatio = await this.poolContract.poolUserShareRatio();
      let poolAddress = await this.poolContract.posAddress();
      this.poolInfo.posAddress = TreeGraph.format.hex(poolAddress);
    },

    async loadPosNodeStatus() {
      const account = await appClient.pos.getAccount(this.poolInfo.posAddress);
      this.poolInfo.status = account.status;
      // console.log(this.poolInfo.status);

      // const committee = await appClient.pos.getCommittee();
      // let nodes = committee.currentCommittee.nodes.map(item => item.address);
      // this.poolInfo.inCommittee = nodes.includes(this.poolInfo.posAddress);
      // console.log(nodes);
    },

    async loadPoolInfo() {
      const poolSummary = await this.poolContract.poolSummary();
      this.poolInfo.totalLocked = BigInt(poolSummary[0].toString()) * BigInt(ONE_VOTE_CFX) * BigInt("1000000000000000000");
      this.poolInfo.totalRevenue = BigInt(TreeGraph.Drip(poolSummary[2].toString()));
      this.poolInfo.apy = Number(await this.poolContract.poolAPY()) / 100;

      const stakerNumber = await this.poolContract.stakerNumber();
      this.poolInfo.stakerNumber = stakerNumber.toString();
    },

    async loadLastRewardInfo() {
      const {epoch} = await appClient.pos.getStatus();
      let lastReward = await appClient.pos.getRewardsByEpoch(epoch - 1);
      if (!lastReward) {
        lastReward = await appClient.pos.getRewardsByEpoch(epoch - 2);
      }
      const block = await appClient.cfx.getBlockByHash(lastReward.powEpochHash, false);
      this.poolInfo.lastRewardTime = block.timestamp;
    },

    async loadLockingList() {
      let list = await this.poolContract.userInQueue(this.userInfo.account);
      this.userInfo.userInQueue = list.map(this.mapQueueItem);
    },

    async loadUnlockingList() {
      let list = await this.poolContract.userOutQueue(this.userInfo.account);
      this.userInfo.userOutOueue = list.map(this.mapQueueItem);
    },

    async loadNFTInfo() {
      const count = await this.nftContract.balanceOf(this.userInfo.account);
      this.userInfo.nftCount = Number(count.toString());
    },

    async stake() {
      if (this.stakeCount === 0 || this.stakeCount % ONE_VOTE_CFX != 0 ) {
        alert('Stake count should be multiple of 1000');
        return;
      }

      const tx = this.poolContract
      .increaseStake(this.stakeCount / ONE_VOTE_CFX)
      .sendTransaction({
        from: this.userInfo.account,
        value: TreeGraph.Drip.fromCFX(this.stakeCount),
      });

      const hash = await tx;
      this.txHash = hash;
      hashModal.show();
      
      const receipt = await tx.executed();
      hashModal.hide();

      if (receipt.outcomeStatus === 0) {
        this.loadUserInfo();
        this.loadLockingList();
        this.stakeCount = 0;  // clear stake count
        // alert('Stake success');
      } else {
        alert('Stake failed');
      }
    }, 

    async claim() {
      if (this.userInfo.userInterest == 0 ) {
        alert('No claimable interest');
        return;
      }
      let tx = this.poolContract
        .claimAllInterest()
        .sendTransaction({
          from: this.userInfo.account,
        });

      const hash = await tx;
      this.txHash = hash;
      hashModal.show();

      const receipt = await tx.executed();
      hashModal.hide();

      if (receipt.outcomeStatus === 0) {
        this.loadUserInfo();
        // alert('Claim success');
      } else {
        alert('Claim failed');
      }
    }, 

    async unstake() {
      if (this.userInfo.locked === BigInt(0)) {
        alert('No unstakeable funds');
        return;
      }
      if (this.unstakeCount === 0 || this.unstakeCount % ONE_VOTE_CFX != 0 ) {
        alert('Unstake count should be multiple of 1000');
        return;
      }
      const unstakeVotePower = this.unstakeCount / ONE_VOTE_CFX;

      let tx = this.poolContract
      .decreaseStake(unstakeVotePower)
      .sendTransaction({
        from: this.userInfo.account,
      });

      const hash = await tx;
      this.txHash = hash;
      hashModal.show();

      let receipt = await tx.executed();
      hashModal.hide();

      if (receipt.outcomeStatus === 0) {
        this.loadUserInfo();
        this.loadUnlockingList();
        this.unstakeCount = 0;  // clear unstake count
        // alert('UnStake success');
      } else {
        alert('UnStake failed');
      }
    },

    async withdraw() {
      if (this.userInfo.unlocked === BigInt(0)) {
        alert('No withdrawable funds');
        return;
      }

      try{
        let tx = this.poolContract
        .withdrawStake(this.userInfo.unlocked.toString())
        .sendTransaction({
          from: this.userInfo.account,
        });

        const hash = await tx;
        this.txHash = hash;
        hashModal.show();

        const receipt = await tx.executed();
        hashModal.hide();
        
        if (receipt.outcomeStatus === 0) {
          this.loadUserInfo();
          // alert('Withdraw success');
        } else {
          alert('Withdraw failed');
        }
      } catch(err) {
        console.log("The unlock time is estimated by PoW block number is not very accurate. Your votes is still unlocking, please try again several hours later", err);
        withdrawModal.show();
      }
    },

    loadRewardData() {
      const posAddress = '0xd8a68700530423e992d571e82467e67b3bce5940cd9cfa14f6615b8a11a3dba2';
      const url = `https://confluxscan.io/stat/list-pos-account-reward?identifier=${posAddress}&limit=20&orderBy=createdAt&reverse=true`;
      fetch(url)
        .then(response => response.json())
        .then(data => {
          initLineChart(data);
        });
    }
  }
};

Vue.createApp(PoSPool).mount('#app');

function initLineChart(rewards) {
  const { list } = rewards;
  const labels = list.map(item => formatTime(new Date(item.createdAt)));
  const items = list.map(item => {
    const formated = formatUnit(item.reward, 'CFX');
    const onlyValue = formated.split(' ')[0];
    return Number(onlyValue);
  });

  const data = {
    labels: labels.reverse(),
    datasets: [{
      label: 'Rewards Per Hour (CFX)',
      backgroundColor: 'rgb(66, 184, 131)',
      borderColor: 'cornflowerblue',
      data: items.reverse(),
    }]
  };

  const config = {
    type: 'line',
    data: data,
    options: {}
  };

  document.getElementById('rewardChartContainer').removeAttribute('style');
  const chartEle = document.getElementById('rewardChart')
  const rewardChart = new Chart(chartEle, config);
}

/* function updateHash(hash) {
  const hashLink = document.getElementById('hashLink');
  hashLink.href = `${scanUrl}/tx/${hash}`;
  hashLink.innerText = hash.slice(0, 10) + '...';

  const modalEle = document.getElementById('hashModal');
  var hashModal = new bootstrap.Modal(modalEle, {});
  // 

  modalEle.addEventListener('hidden.bs.modal', function() {
    hashModal.dispose();
  });

  return hashModal;
} */