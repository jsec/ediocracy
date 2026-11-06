import { readFileSync } from 'node:fs';

import { readX12 } from '@ediocracy/parser';
import { describe, expect, it } from 'vitest';

import { EXAMPLE_FILENAMES } from '../src/lib/examples.mjs';
import { buildWalkthrough } from '../src/lib/walkthrough.mjs';

const ELEMENT_SEPARATOR = '*';
const LINE_BREAKS = /\r?\n/g;

const FIELD_NAMES = {
  ISA: ['Authorization type', 'Authorization value', 'Security type', 'Security value', 'Sender ID type', 'Sender ID', 'Receiver ID type', 'Receiver ID', 'Date', 'Time', 'Repetition separator', 'Envelope version', 'Control number', 'Acknowledgment request', 'Test or production', 'Component separator'],
  GS: ['Group type', 'Sender code', 'Receiver code', 'Date', 'Time', 'Group control number', 'Agency', 'Version'],
  ST: ['Transaction set type', 'Control number', 'Guide version'],
  BHT: ['Hierarchy structure', 'Purpose', 'Reference', 'Date', 'Time'],
  HL: ['Level ID', 'Parent level ID', 'Level type', 'Has child levels'],
  NM1: ['Party role', 'Person or organization', 'Last name or organization', 'First name', 'Middle name', 'Prefix', 'Suffix', 'ID type', 'ID'],
  EB: ['Benefit status', 'Coverage level', 'Service type', 'Insurance type', 'Plan description'],
  DTP: ['Date type', 'Date format', 'Date or range'],
  MSG: ['Message text'],
  SE: ['Segment count', 'Control number'],
  GE: ['Transaction set count', 'Group control number'],
  IEA: ['Group count', 'Control number'],
};

const examplesDirectory = new URL('../public/examples/', import.meta.url);
const scenarioFiles = EXAMPLE_FILENAMES.filter((filename) => filename !== 'multiple-interchanges.edi');

const baselineIsa = [
  'ISA',
  '00',
  ''.padEnd(10),
  '00',
  ''.padEnd(10),
  'ZZ',
  'CEDARVALLEYHP'.padEnd(15),
  'ZZ',
  'OAKSTMEDGROUP'.padEnd(15),
  '260919',
  '1200',
  '^',
  '00501',
  '000000001',
  '0',
  'P',
  ':',
].join(ELEMENT_SEPARATOR);
const baseline = `${baselineIsa}~GS*HB*CEDARVALLEYHP*OAKSTMEDGROUP*20260919*1200*1*X*005010X279A1~ST*271*0001*005010X279A1~BHT*0022*11*ELIG0000001*20260919*1200~HL*1**20*1~NM1*PR*2*CEDAR VALLEY HEALTH PLAN~HL*2*1*21*1~NM1*1*2*OAK STREET MEDICAL GROUP~HL*3*2*22*0~NM1*IL*1*REED*JORDAN~EB*1**30~SE*10*0001~GE*1*1~IEA*1*000000001~`;

function readExample(filename) {
  return readFileSync(new URL(filename, examplesDirectory), 'utf8');
}

function walkthroughSegments(filename) {
  const walkthrough = buildWalkthrough(readExample(filename));

  return walkthrough.interchanges.flatMap((interchange) => interchange.segments);
}

describe('example files', () => {
  it.each(EXAMPLE_FILENAMES)('should read %s without parser findings', (filename) => {
    const document = readX12(readExample(filename));

    expect(document.findings).toEqual([]);
  });

  it.each(scenarioFiles)('should contain one interchange in %s', (filename) => {
    const document = readX12(readExample(filename));

    expect(document.interchanges).toHaveLength(1);
  });

  it('should build multiple-interchanges.edi from single-eb.edi followed by medicare-advantage.edi', () => {
    const multiple = readExample('multiple-interchanges.edi');
    const singleEb = readExample('single-eb.edi');
    const medicareAdvantage = readExample('medicare-advantage.edi');
    const document = readX12(multiple);

    expect(multiple).toBe(singleEb + medicareAdvantage);
    expect(document.interchanges).toHaveLength(2);
  });

  it('should use only supported segments, and no SBR, in the coordination examples', () => {
    const segmentIds = (source) => source
      .split('~')
      .filter((segment) => segment.length > 0 && segment !== '\n')
      .map((segment) => segment.split(ELEMENT_SEPARATOR)[0]);

    const secondaryPayerIds = segmentIds(readExample('medicare-secondary-payer.edi'));
    const primaryCommercialIds = segmentIds(readExample('medicare-primary-commercial-secondary.edi'));

    expect(secondaryPayerIds).toEqual([
      'ISA', 'GS', 'ST', 'BHT', 'HL', 'NM1', 'HL', 'NM1', 'HL', 'NM1', 'EB', 'DTP', 'SE', 'GE', 'IEA',
    ]);
    expect(primaryCommercialIds).toEqual([
      'ISA', 'GS', 'ST', 'BHT', 'HL', 'NM1', 'HL', 'NM1', 'HL', 'NM1', 'EB', 'EB', 'MSG', 'SE', 'GE', 'IEA',
    ]);
  });

  describe('party names', () => {
    it.each(scenarioFiles)('should not use placeholder names in %s', (filename) => {
      const source = readExample(filename);

      expect(source).not.toMatch(/SYNTH/);
    });

    it.each(scenarioFiles)('should name a payer, a provider, and a subscriber with a first name in %s', (filename) => {
      const nameSegments = walkthroughSegments(filename).filter((segment) => segment.name === 'NM1');
      const fieldsByPosition = nameSegments.map((segment) => Object.fromEntries(
        segment.fields.map((field) => [field.position, field.rawValue]),
      ));
      const roles = fieldsByPosition.map((fields) => fields.NM101);
      const subscriber = fieldsByPosition.find((fields) => fields.NM101 === 'IL');

      expect(roles).toEqual(['PR', '1P', 'IL']);
      expect(subscriber.NM104).toBeTruthy();
    });

    it('should use different party names in each scenario', () => {
      const namesByRole = new Map([
        ['PR', new Set()],
        ['1P', new Set()],
        ['IL', new Set()],
      ]);

      for (const filename of scenarioFiles) {
        const nameSegments = walkthroughSegments(filename).filter((segment) => segment.name === 'NM1');

        for (const segment of nameSegments) {
          const fields = Object.fromEntries(segment.fields.map((field) => [field.position, field.rawValue]));

          namesByRole.get(fields.NM101).add(fields.NM103);
        }
      }

      const nameCounts = [...namesByRole.values()].map((names) => names.size);

      expect(nameCounts).toEqual([scenarioFiles.length, scenarioFiles.length, scenarioFiles.length]);
    });
  });
});

describe('buildWalkthrough', () => {
  describe('validation', () => {
    it('should reject an envelope the parser reports a finding for', () => {
      const malformed = baseline.replace('GE*1*1~', 'GE*2*1~');

      expect(() => buildWalkthrough(malformed)).toThrow(/gs-ge-transaction-count-mismatch/);
    });

    it('should reject an unknown segment', () => {
      const source = readExample('single-eb.edi').replace('EB*1**30**SILVER PPO~', 'ZZZ*value~');

      expect(() => buildWalkthrough(source)).toThrow(/Unsupported segment name: ZZZ/);
    });

    it('should reject an unknown field position', () => {
      const message = 'MSG*MEDICARE ADVANTAGE COVERAGE REPORTED~';
      const source = readExample('medicare-advantage.edi').replace(message, message.replace('~', '*extra~'));

      expect(() => buildWalkthrough(source)).toThrow(/Unsupported field position: MSG02/);
    });

    it.each([
      ['text that does not start with an ISA', 'GS*HB*CEDARVALLEYHP*OAKSTMEDGROUP~', 'unexpected-data'],
      ['an interchange with no IEA', readExample('single-eb.edi').replace('IEA*1*000000101~', ''), 'missing-iea'],
      ['text after the last interchange', `${readExample('single-eb.edi')}trailing-junk`, 'unexpected-data'],
      ['a truncated second ISA', `${readExample('single-eb.edi')}${readExample('single-eb.edi').slice(0, 105)}`, 'invalid-isa'],
    ])('should reject %s', (_description, source, code) => {
      expect(() => buildWalkthrough(source)).toThrow(expect.objectContaining({ code }));
    });
  });

  describe('segments', () => {
    it.each(EXAMPLE_FILENAMES)('should list every source segment of %s once, in order', (filename) => {
      const sourceSegments = readExample(filename)
        .replace(LINE_BREAKS, '')
        .split('~')
        .filter(Boolean)
        .map((segment) => `${segment}~`);
      const rawSegments = walkthroughSegments(filename).map((segment) => segment.raw);

      expect(rawSegments).toEqual(sourceSegments);
    });

    it('should keep the two interchanges of multiple-interchanges.edi in their own order', () => {
      const multiple = buildWalkthrough(readExample('multiple-interchanges.edi'));
      const singleEb = buildWalkthrough(readExample('single-eb.edi'));
      const medicareAdvantage = buildWalkthrough(readExample('medicare-advantage.edi'));
      const interchangeSegments = multiple.interchanges.map((interchange) => interchange.segments);

      expect(interchangeSegments).toEqual([
        singleEb.interchanges[0].segments,
        medicareAdvantage.interchanges[0].segments,
      ]);
    });

    it('should put each terminated segment of the display source on its own line', () => {
      const walkthrough = buildWalkthrough(baseline);
      const lines = walkthrough.displaySource.split('\n');

      expect(lines).toHaveLength(14);
      expect(lines.every((line) => line.endsWith('~'))).toBe(true);
      expect(lines.join('')).toBe(baseline);
    });
  });

  describe('fields', () => {
    it.each(EXAMPLE_FILENAMES)('should give every segment and field in %s a name and explanation', (filename) => {
      const segments = walkthroughSegments(filename);
      const fields = segments.flatMap((segment) => segment.fields);
      const unlabeledSegments = segments.filter((segment) => !segment.name || !segment.explanation);
      const unlabeledFields = fields.filter((field) => !field.position || !field.name || !field.explanation);

      expect(unlabeledSegments).toEqual([]);
      expect(unlabeledFields).toEqual([]);
    });

    it.each(EXAMPLE_FILENAMES)('should show empty fields in %s as (empty)', (filename) => {
      const emptyFields = walkthroughSegments(filename)
        .flatMap((segment) => segment.fields)
        .filter((field) => field.rawValue === '');

      expect(emptyFields.every((field) => field.displayValue === '(empty)')).toBe(true);
    });

    it.each(EXAMPLE_FILENAMES)('should list all sixteen ISA fields in %s', (filename) => {
      const expectedPositions = Array.from({ length: 16 }, (_, index) => `ISA${String(index + 1).padStart(2, '0')}`);
      const isaPositions = walkthroughSegments(filename)
        .filter((segment) => segment.name === 'ISA')
        .map((segment) => segment.fields.map((field) => field.position));

      for (const positions of isaPositions) {
        expect(positions).toEqual(expectedPositions);
      }
    });

    it.each(EXAMPLE_FILENAMES)('should use the guide field names in %s', (filename) => {
      const segments = walkthroughSegments(filename);
      const fieldNames = segments.map((segment) => segment.fields.map((field) => field.name));
      const expectedNames = segments.map((segment) => FIELD_NAMES[segment.name].slice(0, segment.fields.length));

      expect(fieldNames).toEqual(expectedNames);
    });

    it('should explain coded values', () => {
      const secondary = walkthroughSegments('medicare-secondary-payer.edi');
      const advantage = walkthroughSegments('medicare-advantage.edi');
      const fieldExplanation = (segments, segmentName, position) => segments
        .find((segment) => segment.name === segmentName)
        .fields.find((field) => field.position === position).explanation;

      expect(fieldExplanation(secondary, 'GS', 'GS01')).toMatch(/eligibility responses/);
      expect(fieldExplanation(secondary, 'BHT', 'BHT01')).toMatch(/payer, provider, subscriber, and dependent/);
      expect(fieldExplanation(secondary, 'BHT', 'BHT02')).toMatch(/a response/);
      expect(fieldExplanation(secondary, 'DTP', 'DTP01')).toMatch(/when the plan is in effect/);
      expect(fieldExplanation(secondary, 'EB', 'EB01')).toMatch(/active coverage/);
      expect(fieldExplanation(secondary, 'ISA', 'ISA15')).toMatch(/test data/);
      expect(fieldExplanation(secondary, 'NM1', 'NM108')).toMatch(/payer ID/);
      expect(fieldExplanation(advantage, 'GS', 'GS01')).toMatch(/eligibility responses/);
    });

    it('should not use backticks in field explanations', () => {
      const explanations = walkthroughSegments('medicare-secondary-payer.edi')
        .flatMap((segment) => segment.fields)
        .map((field) => field.explanation)
        .join(' ');

      expect(explanations).not.toMatch(/`/);
    });
  });
});
