import type { Segment } from '../../../../reader/segment.js';
import type { Benefit } from '../../types.js';

/** A patient attribution row (EB01 `CB`, `D` or `E` with EB06 `25`). */
export type AttributionEntry = {
    /** The row as `read271` returned it. */
    benefit: Benefit;
    /** DTP01 `357`: the end of the attribution. */
    end: Temporal.PlainDate | undefined;
    /** DTP01 `356`: the start of the attribution. */
    start: Temporal.PlainDate | undefined;
    /** From EB01: `CB` is `yes`, `D` is `no` and `E` is `not-applicable`. */
    status: 'no' | 'not-applicable' | 'yes';
};

/**
 * A problem `cignaProfile` finds in a member.
 *
 * - `attribution-status-mismatch`: an `Attribution Status` MSG says Yes, No or Not applicable,
 *   but EB01 is not the matching `CB`, `D` or `E`.
 */
export type CignaFindingCode = 'attribution-status-mismatch';

/** The Cigna view of one member. */
export type CignaView = {
    /** Patient attribution rows, in order. */
    attribution: AttributionEntry[];
    /** The first EB01 `1` MSG that is `PHS` or `PHS+`, or ends in `Care Management`, as sent. */
    careManagement: string | undefined;
    /** HRA balance rows: EB01 `F` with an `HRA Balance` or `HRA remaining Balance` MSG. */
    hraBalances: HraBalanceEntry[];
    /** True when an EB01 `1`, EB03 `30` row has `CareLink` in EB05. */
    isCareLink: boolean;
    /** The member's plan network (REF01 `N6`), or `undefined`. */
    network: NetworkEntry | undefined;
    /** Whether a MSG on an EB01 `1`, EB03 `30` row says the provider is in or out of network. */
    participation: 'in-network' | 'out-of-network' | undefined;
    /** Partner arrangement rows (EB01 `U`), in order. */
    partners: PartnerEntry[];
    /** Restricted shared-risk network rows (EB01 `N`), in order. */
    sharedRiskNetworks: SharedRiskNetworkEntry[];
};

/** An HRA balance row. */
export type HraBalanceEntry = {
    /** EB07. */
    amount: string | undefined;
    /** The row as `read271` returned it. */
    benefit: Benefit;
    /** `starting` for an `HRA Balance` MSG, `remaining` for `HRA remaining Balance`. */
    kind: 'remaining' | 'starting';
};

/** The member's plan network. */
export type NetworkEntry = {
    /** REF03. */
    description: string | undefined;
    /** REF02. */
    name: string | undefined;
    /** The REF segment. */
    segment: Segment;
};

/** A partner arrangement row. */
export type PartnerEntry = {
    /** The row as `read271` returned it. */
    benefit: Benefit;
    /** The row's MSG text, as sent. */
    messages: string[];
    /** NM103 of the row's first 2120 NM1, or EB05 when the row has no 2120. */
    name: string | undefined;
    /** The number after the first `TE` qualifier in that 2120's PER. */
    phone: string | undefined;
};

/** A restricted shared-risk network row. */
export type SharedRiskNetworkEntry = {
    /** The row as `read271` returned it. */
    benefit: Benefit;
    /** NM103 of the row's first 2120 NM1: the organization that manages the network. */
    manager: string | undefined;
};
