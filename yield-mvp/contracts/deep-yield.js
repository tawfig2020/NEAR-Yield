import {
  NearBindgen,
  call,
  view,
  near,
  UnorderedMap,
  initialize,
  assert,
} from "near-sdk-js";

@NearBindgen({})
class DeepYieldContract {
  constructor() {
    this.opportunities = new UnorderedMap('opportunities');
    this.userBalances = new UnorderedMap('balances');
    this.totalTVL = 0;
  }

  @call({})
  addOpportunity({ protocol, apy, tvl, risk }) {
    const opportunity = {
      id: this.opportunities.length,
      protocol,
      apy,
      tvl,
      risk,
      deposits: {},
      totalDeposits: 0
    };
    this.opportunities.set(opportunity.id.toString(), opportunity);
    return opportunity;
  }

  @view({})
  getOpportunities() {
    return this.opportunities.toArray();
  }

  @call({})
  deposit({ opportunityId, amount }) {
    const opportunity = this.opportunities.get(opportunityId.toString());
    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    const accountId = near.signerAccountId();
    opportunity.deposits[accountId] = (opportunity.deposits[accountId] || 0) + amount;
    opportunity.totalDeposits += amount;
    this.opportunities.set(opportunityId.toString(), opportunity);
    return opportunity;
  }

  @call({})
  withdraw({ opportunityId, amount }) {
    const opportunity = this.opportunities.get(opportunityId.toString());
    if (!opportunity) {
      throw new Error('Opportunity not found');
    }

    const accountId = near.signerAccountId();
    const currentDeposit = opportunity.deposits[accountId] || 0;
    if (currentDeposit < amount) {
      throw new Error('Insufficient funds');
    }

    opportunity.deposits[accountId] -= amount;
    opportunity.totalDeposits -= amount;
    this.opportunities.set(opportunityId.toString(), opportunity);
    return opportunity;
  }

  @view({})
  checkRebalance() {
    const opportunities = this.opportunities.toArray();
    const totalTVL = opportunities.reduce((sum, opp) => sum + opp.tvl, 0);
    const avgAPY = opportunities.reduce((sum, opp) => sum + opp.apy, 0) / opportunities.length;
    
    return {
      opportunities: opportunities.map(opp => ({
        ...opp,
        allocation: (opp.tvl / totalTVL) * 100,
        apyDiff: opp.apy - avgAPY
      }))
    };
  }

  @call({})
  triggerRebalance() {
    const rebalanceInfo = this.checkRebalance();
    const opportunities = rebalanceInfo.opportunities;
    
    // Sort by APY difference (highest to lowest)
    opportunities.sort((a, b) => b.apyDiff - a.apyDiff);
    
    // Calculate target allocations
    const targetAllocations = opportunities.map((opp, i) => ({
      ...opp,
      targetAllocation: Math.max(10, 100 - (i * 20)) // Simple allocation strategy
    }));
    
    return targetAllocations;
  }
}

export default DeepYieldContract;
