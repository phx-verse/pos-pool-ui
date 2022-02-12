
const PoSPool = {
  data() {
    return {
      chainStatus: {},
      poolInfo: {
        status: 'Good', // TODO load the real pool status
        name: '',
        totalLocked: 0,
        totalRevenue: 0,
        userShareRatio: 0,
        apy: 0,
        lastRewardTime: 0,
      },
      userInfo: {
        balance: 0,
        connected: false,
        userStaked: BigInt(0),
        userInterest: 0,
        account: '',
        locked: BigInt(0),
        unlocked: BigInt(0),
        userInQueue: [],
        userOutOueue: [],
      },
      stakeCount: 0,
      unstakeCount: 0,
    }
  },

  async created() {
    await this.loadPoolInfo();
    await this.loadLastRewardInfo();
    await this.loadChainInfo();
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
    }
  },

  methods: {

    async loadChainInfo() {
      const status = await confluxClient.cfx.getStatus();
      this.chainStatus = status;
    },

    async connectWallet() {
      if (!conflux) {
        alert('Please install Conflux Wallet');
        return;
      }
      const accounts = await conflux.send("cfx_requestAccounts");
      const account = accounts[0];
      if (account) {
        this.userInfo.account = account;
        this.userInfo.connected = true;
        this.loadUserInfo();
        await this.loadLockingList();
        await this.loadUnlockingList();
      } else {
        console.log('Request account failed');
      }
    },

    mapQueueItem(item) {
      let now = new Date().getTime();
      // TODO chainStatus must have here
      let unlockBlockNumber = Number(item[1].toString()) - this.chainStatus.blockNumber;
      let unlockTime = new Date(now + unlockBlockNumber / 2 * 1000);
      return {
        amount: voteToCFX(item[0]),
        endTime: formatDateTime(unlockTime),
      }
    },

    async loadUserInfo() {
      const userSummary = await poolContract.userSummary(this.userInfo.account);
      this.userInfo.userStaked = BigInt(userSummary[0].toString());
      this.userInfo.locked = BigInt(userSummary[2].toString());
      this.userInfo.unlocked = BigInt(userSummary[3].toString());
      // this.userInfo.userInterest = TreeGraph.Drip(userSummary[5].toString()).toCFX();
      const userInterest = await poolContract.userInterest(this.userInfo.account);
      this.userInfo.userInterest = trimPoints(TreeGraph.Drip(userInterest.toString()).toCFX());

      const balance = await confluxClient.cfx.getBalance(this.userInfo.account);
      this.userInfo.balance = trimPoints(TreeGraph.Drip(balance).toCFX());
    },

    async loadPoolInfo() {
      this.poolInfo.name = await poolContract.poolName();
      this.poolInfo.userShareRatio = await poolContract.poolUserShareRatio();
      const poolSummary = await poolContract.poolSummary();
      this.poolInfo.totalLocked = BigInt(poolSummary[0].toString()) * BigInt(ONE_VOTE_CFX);
      this.poolInfo.totalRevenue = trimPoints(TreeGraph.Drip(poolSummary[2].toString()).toCFX());
      this.poolInfo.apy = Number(await poolContract.poolAPY()) / 100;
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
      let list = await poolContract.userInQueue(this.userInfo.account);
      this.userInfo.userInQueue = list.map(this.mapQueueItem);
    },

    async loadUnlockingList() {
      let list = await poolContract.userOutQueue(this.userInfo.account);
      this.userInfo.userOutOueue = list.map(this.mapQueueItem);
    },

    async stake() {
      if (this.stakeCount % ONE_VOTE_CFX != 0 ) {
        alert('Stake count should be multiple of 1000');
        return;
      }
      let receipt = await poolContract
        .increaseStake(this.stakeCount / ONE_VOTE_CFX)
        .sendTransaction({
          from: this.userInfo.account,
          value: TreeGraph.Drip.fromCFX(this.stakeCount),
        })
        .executed();
      if (receipt.outcomeStatus === 0) {
        this.loadUserInfo();
        this.stakeCount = 0;  // clear stake count
        alert('Stake success');
      } else {
        alert('Stake failed');
      }
    }, 

    async claim() {
      if (this.userInfo.userInterest == 0 ) {
        alert('No claimable interest');
        return;
      }
      let receipt = await poolContract
        .claimAllInterest()
        .sendTransaction({
          from: this.userInfo.account,
        })
        .executed();
      
      if (receipt.outcomeStatus === 0) {
        this.loadUserInfo();
        alert('Claim success');
      } else {
        alert('Claim failed');
      }
    }, 

    async unstake() {
      if (this.userInfo.locked === BigInt(0)) {
        alert('No unstakeable funds');
        return;
      }
      if (this.unstakeCount % ONE_VOTE_CFX != 0 ) {
        alert('Unstake count should be multiple of 1000');
        return;
      }
      const unstakeVotePower = this.unstakeCount / ONE_VOTE_CFX;
      let receipt = await poolContract
        .decreaseStake(unstakeVotePower)
        .sendTransaction({
          from: this.userInfo.account,
        })
        .executed();

      if (receipt.outcomeStatus === 0) {
        this.loadUserInfo();
        this.unstakeCount = 0;  // clear unstake count
        alert('UnStake success');
      } else {
        alert('UnStake failed');
      }
    },

    async withdraw() {
      if (this.userInfo.unlocked === BigInt(0)) {
        alert('No withdrawable funds');
        return;
      }
      let receipt = await poolContract
        .withdrawStake(this.userInfo.unlocked.toString())
        .sendTransaction({
          from: this.userInfo.account,
        })
        .executed();
      
      if (receipt.outcomeStatus === 0) {
        this.loadUserInfo();
        alert('Withdraw success');
      } else {
        alert('Withdraw failed');
      }
    }
  }
};

Vue.createApp(PoSPool).mount('#app');