import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { Grammar, Loop } from '../src/loops/types.js';
import type { Transaction, X12Document } from '../src/reader/types.js';

import { read271s, readX12, type Response271, X12SyntaxError } from '../src/index.js';
import { buildLoops } from '../src/loops/loops.js';

export const fixtureDirectory = path.resolve(import.meta.dirname, 'fixtures');

export type LoopSummary = {
    id: string;
    loops: LoopSummary[];
    tags: string[];
};

export function envelopeLines(document: X12Document): string[] {
    const lines: string[] = [];

    for (const interchange of document.interchanges) {
        lines.push(`ISA ${interchange.header.element(13) ?? '-'} IEA ${interchange.trailer.element(2) ?? '-'}`);

        for (const group of interchange.groups) {
            lines.push(`GS ${group.header.element(6) ?? '-'} GE ${group.trailer.element(2) ?? '-'}`);

            for (const transaction of group.transactions) {
                lines.push(`ST ${transaction.header.element(1) ?? '-'} ${transaction.header.element(2) ?? '-'} SE ${transaction.trailer.element(2) ?? '-'}`);
            }
        }
    }

    return lines;
}

export function findingCodes(body: string, grammar: Grammar): string[] {
    return buildLoops(transactionOf(body), grammar).findings.map(({ code }) => code);
}

export function firstTransaction(text: string): Transaction {
    const transaction = readX12(text).interchanges[0]?.groups[0]?.transactions[0];

    if (!transaction) {
        throw new Error('No transaction set in the text');
    }

    return transaction;
}

export function only271(text: string): Response271 {
    const [result] = read271s(readX12(text));

    if (!result) {
        throw new Error('No 271 transaction set in the text');
    }

    return result.response;
}

export function readFixture(name: string): string {
    return readFileSync(path.resolve(fixtureDirectory, name), 'utf8');
}

export function singleEnvelope(control: number, transactionSet = '000'): string[] {
    const isa13 = String(control).padStart(9, '0');
    const st02 = String(control).padStart(4, '0');

    return [`ISA ${isa13} IEA ${isa13}`, `GS ${control} GE ${control}`, `ST ${transactionSet} ${st02} SE ${st02}`];
}

export function summaries(body: string, grammar: Grammar): LoopSummary[] {
    return buildLoops(transactionOf(body), grammar).loops.map(loop => summarize(loop));
}

export function summarize(loop: Loop): LoopSummary {
    return {
        id: loop.id,
        loops: loop.loops.map(child => summarize(child)),
        tags: loop.segments.map(({ tag }) => tag),
    };
}

export function thrown(text: string): X12SyntaxError {
    try {
        readX12(text);
    } catch (error) {
        if (error instanceof X12SyntaxError) {
            return error;
        }

        throw error;
    }

    throw new Error('readX12 did not throw');
}

// Wraps body segments in an interchange, group, and transaction set with correct counts.
export function transactionOf(body: string): Transaction {
    // SE01 counts the ST and SE as well as the body.
    const count = body.split('~').filter(segment => segment !== '').length + 2;
    const isa = 'ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *260914*1200*^*00501*000000001*0*P*:~';
    const text = `${isa}GS*HS*S*R*20260914*1200*1*X*005010X279A1~ST*999*0001~${body}SE*${count}*0001~GE*1*1~IEA*1*000000001~`;

    return firstTransaction(text);
}

// Wraps an ST…SE transaction set in an interchange and group.
export function wrap(transactionSet: string, repetition = '^'): string {
    const isa = `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *060501*1319*${repetition}*00501*000000001*0*P*:~`;

    return `${isa}GS*HB*S*R*20060501*1319*1*X*005010X279A1~${transactionSet.trim()}GE*1*1~IEA*1*000000001~`;
}
