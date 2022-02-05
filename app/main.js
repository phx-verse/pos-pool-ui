
const PoSPool = {
  data() {
    return {
      poolInfo: {
        status: 'Good',
        name: '',
        totalLocked: 0,
        totalRevenue: 0,
        userShareRatio: 0,
        apy: 0,
      },
      userInfo: {
        connected: false,
        userStaked: BigInt(0),
        userInterest: 0,
        account: '',
        locked: BigInt(0),
        unlocked: BigInt(0),
      },
      stakeCount: 0,
      unstakeCount: 0,
    }
  },

  async created() {
    await this.loadPoolInfo();
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
    }
  },

  methods: {
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
      }  
    },

    async loadUserInfo() {
      const userSummary = await poolContract.userSummary(this.userInfo.account);
      this.userInfo.userStaked = BigInt(userSummary[0].toString());
      this.userInfo.locked = BigInt(userSummary[2].toString());
      this.userInfo.unlocked = BigInt(userSummary[3].toString());
      this.userInfo.userInterest = TreeGraph.Drip(userSummary[5].toString()).toCFX();
    },

    async loadPoolInfo() {
      this.poolInfo.name = await poolContract.poolName();
      this.poolInfo.userShareRatio = await poolContract.poolUserShareRatio();
      const poolSummary = await poolContract.poolSummary();
      this.poolInfo.totalLocked = BigInt(poolSummary[0].toString()) * BigInt(ONE_VOTE_CFX);
      this.poolInfo.totalRevenue = trimPoints(TreeGraph.Drip(poolSummary[2].toString()).toCFX());
      this.poolInfo.apy = Number(await poolContract.poolAPY()) / 100;
    },

    async withdraw() {
      if (!this.userInfo.connected) {
        alert('Please connect wallet');
        return;
      }
      let receipt = await poolContract
        .withdrawStake(this.userInfo.unlocked)
        .sendTransaction({
          from: this.userInfo.account,
        });
      
      if (receipt.outcomeStatus === 0) {
        this.loadUserInfo();
        alert('withdraw success');
      } else {
        alert('withdraw failed');
      }
    }, 

    async claim() {
      if (!this.userInfo.connected) {
        alert('Please connect wallet');
        return;
      }
      let receipt = await poolContract
        .claimAllInterest()
        .sendTransaction({
          from: this.userInfo.account,
        });
      
      if (receipt.outcomeStatus === 0) {
        this.loadUserInfo();
        alert('claim success');
      } else {
        alert('claim failed');
      }
    }, 

    async unstake() {
      if (!this.userInfo.connected) {
        alert('Please connect wallet');
        return;
      }
      if (this.unstakeCount % ONE_VOTE_CFX != 0 ) {
        alert('Unstake count should be multiple of 1000');
        return;
      }
      // TODO check if user has enough to unstake
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

    async stake() {
      if (!this.userInfo.connected) {
        alert('Please connect wallet');
        return;
      }
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
    }
  }
};

Vue.createApp(PoSPool).mount('#app');