import {
  NearBindgen,
  call,
  view,
  near,
  UnorderedMap,
  initialize,
  assert,
} from "near-sdk-js";

interface Opportunity {
  id: number;
  protocol: string;
  apy: number;
  tvl: number;
  risk: number;
  deposits: { [accountId: string]: number };
  totalDeposits: number;
}

@NearBindgen({})
class DeepYieldContract {
  opportunities: UnorderedMap<Opportunity>;
  userBalances: UnorderedMap<number>;
  totalTVL: number;

  constructor() {
    this.opportunities = new UnorderedMap('opportunities');
    this.userBalances = new UnorderedMap('balances');
    this.totalTVL = 0;
  }

  @initialize({})
  init(): void {
    assert(!this.opportunities.length, "Contract is already initialized");
  }

  @call({})
  addOpportunity({ protocol, apy, tvl, risk }: { protocol: string; apy: number; tvl: number; risk: number }): Opportunity {
    const opportunity: Opportunity = {
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
  getOpportunities(): Opportunity[] {
    const entries = this.opportunities.toArray();
    return entries.map(([_, opportunity]) => opportunity);
  }

  @call({})
  deposit({ opportunityId, amount }: { opportunityId: number; amount: number }): Opportunity {
    const opportunity = this.opportunities.get(opportunityId.toString());
    assert(opportunity, "Opportunity not found");

    const accountId = near.signerAccountId();
    opportunity.deposits[accountId] = (opportunity.deposits[accountId] || 0) + amount;
    opportunity.totalDeposits += amount;
    this.opportunities.set(opportunityId.toString(), opportunity);
    return opportunity;
  }

  @call({})
  withdraw({ opportunityId, amount }: { opportunityId: number; amount: number }): Opportunity {
    const opportunity = this.opportunities.get(opportunityId.toString());
    assert(opportunity, "Opportunity not found");

    const accountId = near.signerAccountId();
    const currentDeposit = opportunity.deposits[accountId] || 0;
    assert(currentDeposit >= amount, "Insufficient funds");

    opportunity.deposits[accountId] -= amount;
    opportunity.totalDeposits -= amount;
    this.opportunities.set(opportunityId.toString(), opportunity);
    return opportunity;
  }

  @view({})
  checkRebalance(): { opportunities: (Opportunity & { allocation: number; apyDiff: number })[] } {
    const opportunities = this.getOpportunities();
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
  triggerRebalance(): (Opportunity & { allocation: number; apyDiff: number; targetAllocation: number })[] {
    const rebalanceInfo = this.checkRebalance();
    const opportunities = rebalanceInfo.opportunities;
    
    // Sort by APY difference (highest to lowest)
    opportunities.sort((a, b) => b.apyDiff - a.apyDiff);
    
    // Calculate target allocations
    return opportunities.map((opp, i) => ({
      ...opp,
      targetAllocation: Math.max(10, 100 - (i * 20)) // Simple allocation strategy
    }));
  }
}
