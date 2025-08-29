export interface BillingCodeChain {
  /** The ID of the current billing code */
  codeId: number;

  /** The billing code string (e.g., "A001") */
  code: string;

  /** The title/description of the billing code */
  title: string;

  /** The day range for this specific code */
  dayRange: number;

  /** The ID of the root code in this chain */
  rootId: number;

  /** The ID of the previous code in the chain (null for root codes) */
  previousCodeId: number | null;

  /** Cumulative day range up to (but excluding) this code */
  previousDayRange: number;

  /** Cumulative day range including this code */
  cumulativeDayRange: number;

  /** Same as cumulativeDayRange; kept for clarity */
  prevPlusSelf: number;

  /** Whether this code is the last in its chain (no outgoing edges) */
  isLast: boolean;
}

/**
 * Extended interface that includes the path tracking for debugging/analysis
 */
export interface BillingCodeChainWithPath extends BillingCodeChain {
  /** Array of code IDs in the path from root to current code */
  pathIds: number[];
}

/**
 * Helper type for creating new billing code chains
 */
export type CreateBillingCodeChain = Omit<
  BillingCodeChain,
  "codeId" | "rootId"
>;

/**
 * Type for querying billing code chains with filters
 */
export interface BillingCodeChainQuery {
  /** Filter by specific root code ID */
  rootId?: number;

  /** Filter by specific code ID */
  codeId?: number;

  /** Filter by previous code ID */
  previousCodeId?: number;

  /** Filter by minimum cumulative day range */
  minCumulativeDayRange?: number;

  /** Filter by maximum cumulative day range */
  maxCumulativeDayRange?: number;

  /** Limit the number of results */
  limit?: number;

  /** Offset for pagination */
  offset?: number;
}

/**
 * Type for chain analysis results
 */
export interface ChainAnalysis {
  /** The root code of the chain */
  rootCode: BillingCodeChain;

  /** All codes in the chain */
  chainCodes: BillingCodeChain[];

  /** Total cumulative day range for the entire chain */
  totalDayRange: number;

  /** Number of codes in the chain */
  chainLength: number;

  /** Whether the chain has any cycles (should always be false due to safety checks) */
  hasCycles: boolean;
}
