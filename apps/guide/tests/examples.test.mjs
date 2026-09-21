import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { splitInterchanges, validateExample } from '../scripts/lib/validate-example.mjs';
import { buildWalkthrough } from '../src/lib/walkthrough.mjs';

const elementSeparator = '*';
const examplesDirectory = new URL('../public/examples/', import.meta.url);
const canonicalFiles = [
  'single-eb.edi',
  'medicare-secondary-payer.edi',
  'medicare-primary-commercial-secondary.edi',
  'medicare-advantage.edi',
  'multiple-interchanges.edi',
];
const scenarioFiles = canonicalFiles.filter((filename) => filename !== 'multiple-interchanges.edi');

function readExample(filename) {
  return readFileSync(new URL(filename, examplesDirectory), 'utf8');
}

function makeBaseline() {
  const isa = [
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
  ].join(elementSeparator);

  return `${isa}~GS*HB*CEDARVALLEYHP*OAKSTMEDGROUP*20260919*1200*1*X*005010X279A1~ST*271*0001*005010X279A1~BHT*0022*11*ELIG0000001*20260919*1200~HL*1**20*1~NM1*PR*2*CEDAR VALLEY HEALTH PLAN~HL*2*1*21*1~NM1*1*2*OAK STREET MEDICAL GROUP~HL*3*2*22*0~NM1*IL*1*REED*JORDAN~EB*1**30~SE*10*0001~GE*1*1~IEA*1*000000001~`;
}

function assertErrorCode(source, code) {
  const result = validateExample(source);

  assert.deepEqual(result.errors.map(({ code: actualCode }) => actualCode), [code]);
}

test('rejects an input with no ISA', () => {
  const result = validateExample('GS*HB*CEDARVALLEYHP*OAKSTMEDGROUP~');

  assert.deepEqual(result.errors.map(({ code }) => code), ['missing-isa']);
});

test('rejects an ISA shorter than 106 characters through its terminator', () => {
  const result = validateExample(makeBaseline().slice(0, 105));

  assert.deepEqual(result.errors.map(({ code }) => code), ['short-isa']);
});

test('rejects an ISA whose delimiters collide', () => {
  const malformed = `${makeBaseline().slice(0, 82)}*${makeBaseline().slice(83)}`;
  const result = validateExample(malformed);

  assert.deepEqual(result.errors.map(({ code }) => code), ['delimiter-collision']);
});

test('rejects an interchange without IEA', () => {
  const result = validateExample(makeBaseline().replace(/IEA\*1\*000000001~$/, ''));

  assert.deepEqual(result.errors.map(({ code }) => code), ['missing-iea']);
});

test('rejects a transaction with ST but no SE', () => {
  const malformed = makeBaseline().replace('SE*10*0001~', '');
  const result = validateExample(malformed);

  assert.ok(result.errors.some(({ code }) => code === 'missing-se'));
});

test('rejects an ISA and IEA control-number mismatch', () => {
  assertErrorCode(makeBaseline().replace('IEA*1*000000001~', 'IEA*1*000000002~'), 'isa-iea-control-mismatch');
});

test('rejects a GS and GE control-number mismatch', () => {
  assertErrorCode(makeBaseline().replace('GE*1*1~', 'GE*1*2~'), 'gs-ge-control-mismatch');
});

test('rejects an ST and SE control-number mismatch', () => {
  assertErrorCode(makeBaseline().replace('SE*10*0001~', 'SE*10*0002~'), 'st-se-control-mismatch');
});

test('rejects an ST and SE segment-count mismatch', () => {
  assertErrorCode(makeBaseline().replace('SE*10*0001~', 'SE*9*0001~'), 'st-se-segment-count-mismatch');
});

test('rejects a GS and GE transaction-count mismatch', () => {
  assertErrorCode(makeBaseline().replace('GE*1*1~', 'GE*2*1~'), 'gs-ge-transaction-count-mismatch');
});

test('rejects an ISA and IEA group-count mismatch', () => {
  assertErrorCode(makeBaseline().replace('IEA*1*000000001~', 'IEA*2*000000001~'), 'isa-iea-group-count-mismatch');
});

test('rejects an interchange without GE', () => {
  assertErrorCode(makeBaseline().replace('GE*1*1~', ''), 'missing-ge');
});

test('rejects a nonnumeric SE01 count', () => {
  assertErrorCode(makeBaseline().replace('SE*10*0001~', 'SE*X*0001~'), 'invalid-se-segment-count');
});

test('rejects a nonnumeric GE01 count', () => {
  assertErrorCode(makeBaseline().replace('GE*1*1~', 'GE*X*1~'), 'invalid-ge-transaction-count');
});

test('rejects a nonnumeric IEA01 count', () => {
  assertErrorCode(makeBaseline().replace('IEA*1*000000001~', 'IEA*X*000000001~'), 'invalid-iea-group-count');
});

test('rejects a valid interchange followed by a truncated ISA', () => {
  const truncatedIsa = makeBaseline().slice(0, 105);

  assertErrorCode(`${makeBaseline()}${truncatedIsa}`, 'truncated-isa');
});

test('splits two concatenated interchanges into exact source slices', () => {
  const first = makeBaseline();
  const second = makeBaseline()
    .replace('000000001', '000000002')
    .replace('0001', '0002');

  assert.deepEqual(splitInterchanges(`${first}${second}`), [first, second]);
});

test('validates each concatenated interchange with its own delimiters', () => {
  const first = makeBaseline();
  const second = makeBaseline()
    .replaceAll('*', '|')
    .replaceAll('~', '!')
    .replace('GE|1|1!', 'GE|2|1!');

  const result = validateExample(`${first}${second}`);

  assert.deepEqual(result.errors.map(({ code }) => code), ['gs-ge-transaction-count-mismatch']);
});

test('accepts every canonical example without validator errors', () => {
  for (const filename of canonicalFiles) {
    const result = validateExample(readExample(filename));

    assert.deepEqual(result.errors, [], filename);
  }
});

test('coordination examples use supported context without SBR', () => {
  const segmentIds = (source) => source
    .split('~')
    .filter((segment) => segment.length > 0 && segment !== '\n')
    .map((segment) => segment.split('*')[0]);

  assert.deepEqual(segmentIds(readExample('medicare-secondary-payer.edi')), [
    'ISA', 'GS', 'ST', 'BHT', 'HL', 'NM1', 'HL', 'NM1', 'HL', 'NM1', 'EB', 'DTP', 'SE', 'GE', 'IEA',
  ]);
  assert.deepEqual(segmentIds(readExample('medicare-primary-commercial-secondary.edi')), [
    'ISA', 'GS', 'ST', 'BHT', 'HL', 'NM1', 'HL', 'NM1', 'HL', 'NM1', 'EB', 'EB', 'MSG', 'SE', 'GE', 'IEA',
  ]);
});

test('each single-interchange example contains one interchange', () => {
  for (const filename of canonicalFiles.slice(0, 4)) {
    const result = validateExample(readExample(filename));

    assert.equal(result.interchanges.length, 1, filename);
  }
});

test('multiple-interchanges is the exact concatenation of its source examples', () => {
  const multiple = readExample('multiple-interchanges.edi');
  const singleEb = readExample('single-eb.edi');
  const medicareAdvantage = readExample('medicare-advantage.edi');

  assert.equal(multiple, singleEb + medicareAdvantage);
  assert.equal(validateExample(multiple).interchanges.length, 2);
});

test('multiple-interchanges walkthrough keeps two independently ordered interchanges', () => {
  const multiple = buildWalkthrough(readExample('multiple-interchanges.edi')).interchanges;
  const first = buildWalkthrough(readExample('single-eb.edi')).interchanges[0].segments;
  const second = buildWalkthrough(readExample('medicare-advantage.edi')).interchanges[0].segments;

  assert.equal(multiple.length, 2);
  assert.deepEqual(multiple[0].segments, first);
  assert.deepEqual(multiple[1].segments, second);
});

test('every source segment appears once in the ordered walkthrough', () => {
  for (const filename of canonicalFiles) {
    const sourceSegments = readExample(filename)
      .replace(/\r?\n/g, '')
      .split('~')
      .filter(Boolean)
      .map((segment) => `${segment}~`);
    const walkthroughSegments = buildWalkthrough(readExample(filename)).interchanges
      .flatMap(({ segments }) => segments.map(({ raw }) => raw));

    assert.deepEqual(walkthroughSegments, sourceSegments, filename);
  }
});

test('display source places each terminated segment on its own line without changing payload bytes', () => {
  const source = makeBaseline();
  const { displaySource } = buildWalkthrough(source);

  assert.equal(typeof displaySource, 'string');
  const lines = displaySource.split('\n');
  assert.equal(lines.length, 14);
  assert.ok(lines.every((line) => line.endsWith('~')));
  assert.equal(lines.join(''), source);
});

test('scenario examples use distinct plausible party names instead of placeholders', () => {
  const namesByRole = new Map([
    ['PR', new Set()],
    ['1P', new Set()],
    ['IL', new Set()],
  ]);

  for (const filename of scenarioFiles) {
    const source = readExample(filename);
    assert.doesNotMatch(source, /SYNTH/, filename);

    const nameSegments = buildWalkthrough(source).interchanges[0].segments
      .filter(({ name }) => name === 'NM1');
    assert.equal(nameSegments.length, 3, filename);

    for (const segment of nameSegments) {
      const values = Object.fromEntries(segment.fields.map(({ position, rawValue }) => [position, rawValue]));
      namesByRole.get(values.NM101).add(values.NM103);
      if (values.NM101 === 'IL') {
        assert.ok(values.NM104, `${filename}: subscriber first name`);
      }
    }
  }

  for (const [role, names] of namesByRole) {
    assert.equal(names.size, scenarioFiles.length, `${role} names must differ by scenario`);
  }
});

test('every represented positional field has a label and explanation', () => {
  for (const filename of canonicalFiles) {
    const segments = buildWalkthrough(readExample(filename)).interchanges
      .flatMap(({ segments: interchangeSegments }) => interchangeSegments);

    for (const segment of segments) {
      assert.ok(segment.name, `${filename}: segment name`);
      assert.ok(segment.explanation, `${filename}: ${segment.raw} explanation`);
      for (const field of segment.fields) {
        assert.ok(field.position, `${filename}: ${segment.raw} field position`);
        assert.ok(field.name, `${filename}: ${segment.raw} field name`);
        assert.ok(field.explanation, `${filename}: ${segment.raw} field explanation`);
        if (field.rawValue === '') {
          assert.equal(field.displayValue, '(empty)', `${filename}: empty ${field.position} is explicit`);
        }
      }
    }
  }
});

test('ISA walkthroughs expose all sixteen ISA fields', () => {
  for (const filename of canonicalFiles) {
    const isaSegments = buildWalkthrough(readExample(filename)).interchanges
      .flatMap(({ segments }) => segments)
      .filter(({ name }) => name === 'ISA');

    for (const isa of isaSegments) {
      assert.deepEqual(isa.fields.map(({ position }) => position), Array.from({ length: 16 }, (_, index) => `ISA${String(index + 1).padStart(2, '0')}`));
    }
  }
});

test('coded field explanations use the public code meanings without markup punctuation', () => {
  const secondary = buildWalkthrough(readExample('medicare-secondary-payer.edi')).interchanges[0].segments;
  const advantage = buildWalkthrough(readExample('medicare-advantage.edi')).interchanges[0].segments;
  const fieldExplanation = (segments, segmentName, position) => segments
    .find(({ name }) => name === segmentName)
    .fields.find((field) => field.position === position).explanation;

  assert.match(fieldExplanation(secondary, 'GS', 'GS01'), /Eligibility, Coverage or Benefit Information/);
  assert.match(fieldExplanation(secondary, 'BHT', 'BHT01'), /Information Source, Information Receiver, Subscriber, Dependent/);
  assert.match(fieldExplanation(secondary, 'BHT', 'BHT02'), /Response/);
  assert.match(fieldExplanation(secondary, 'DTP', 'DTP01'), /Plan \(date\/range for which plan is in effect\)/);
  assert.match(fieldExplanation(secondary, 'EB', 'EB01'), /Active Coverage/);
  assert.match(fieldExplanation(secondary, 'ISA', 'ISA15'), /code for production data/);
  assert.match(fieldExplanation(advantage, 'GS', 'GS01'), /Eligibility, Coverage or Benefit Information/);
  assert.doesNotMatch(
    secondary.flatMap(({ fields }) => fields).map(({ explanation }) => explanation).join(' '),
    /`/,
  );
});

test('all exercised fields use the exact Stedi 005010 labels', () => {
  const expected = {
    ISA: ['Authorization Information Qualifier', 'Authorization Information', 'Security Information Qualifier', 'Security Information', 'Interchange ID Qualifier', 'Interchange Sender ID', 'Interchange ID Qualifier', 'Interchange Receiver ID', 'Interchange Date', 'Interchange Time', 'Repetition Separator', 'Interchange Control Version Number', 'Interchange Control Number', 'Acknowledgment Requested', 'Interchange Usage Indicator', 'Component Element Separator'],
    GS: ['Functional Identifier Code', "Application Sender's Code", "Application Receiver's Code", 'Date', 'Time', 'Group Control Number', 'Responsible Agency Code', 'Version / Release / Industry Identifier Code'],
    ST: ['Transaction Set Identifier Code', 'Transaction Set Control Number', 'Implementation Convention Reference'],
    BHT: ['Hierarchical Structure Code', 'Transaction Set Purpose Code', 'Reference Identification', 'Date', 'Time'],
    HL: ['Hierarchical ID Number', 'Hierarchical Parent ID Number', 'Hierarchical Level Code', 'Hierarchical Child Code'],
    NM1: ['Entity Identifier Code', 'Entity Type Qualifier', 'Name Last or Organization Name', 'Name First'],
    EB: ['Eligibility or Benefit Information Code', 'Coverage Level Code', 'Service Type Code', 'Insurance Type Code', 'Plan Coverage Description'],
    DTP: ['Date/Time Qualifier', 'Date Time Period Format Qualifier', 'Date Time Period'],
    MSG: ['Free-Form Message Text'],
    SE: ['Number of Included Segments', 'Transaction Set Control Number'],
    GE: ['Number of Transaction Sets Included', 'Group Control Number'],
    IEA: ['Number of Included Functional Groups', 'Interchange Control Number'],
  };

  for (const filename of canonicalFiles) {
    const segments = buildWalkthrough(readExample(filename)).interchanges
      .flatMap(({ segments: interchangeSegments }) => interchangeSegments);
    for (const segment of segments) {
      assert.deepEqual(
        segment.fields.map(({ name }) => name),
        expected[segment.name].slice(0, segment.fields.length),
        `${filename}: ${segment.name}`,
      );
    }
  }
});

test('walkthrough rejects unknown segments and field positions', () => {
  const source = readExample('single-eb.edi');
  const advantage = readExample('medicare-advantage.edi');
  assert.throws(() => buildWalkthrough(source.replace('EB*1**30**SILVER PPO~', 'ZZZ*value~')), /Unsupported segment name: ZZZ/);
  assert.throws(() => buildWalkthrough(advantage.replace('MSG*MEDICARE ADVANTAGE COVERAGE REPORTED~', 'MSG*MEDICARE ADVANTAGE COVERAGE REPORTED*extra~')), /Unsupported field position: MSG02/);
});

test('walkthrough rejects incomplete or unconsumed source input', () => {
  const single = readExample('single-eb.edi');
  const truncatedSecondIsa = `${single}${single.slice(0, 105)}`;

  assert.throws(() => buildWalkthrough('GS*HB*CEDARVALLEYHP*OAKSTMEDGROUP~'), /Cannot build walkthrough: missing-isa/);
  assert.throws(() => buildWalkthrough(single.replace('IEA*1*000000101~', '')), /Cannot build walkthrough: missing-iea/);
  assert.throws(() => buildWalkthrough(`${single}trailing-junk`), /Cannot build walkthrough: unconsumed-input/);
  assert.throws(() => buildWalkthrough(truncatedSecondIsa), /Cannot build walkthrough: truncated-isa/);
});
