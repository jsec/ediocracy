// @ts-check

/** @typedef {{ code: string, message: string }} ValidationError */
/** @typedef {{ interchanges: string[], errors: ValidationError[] }} ValidationResult */

const ISA_LENGTH = 106;
const ISA_ELEMENT_SEPARATOR_OFFSET = 3;
const ISA_REPETITION_SEPARATOR_OFFSET = 82;
const ISA_COMPONENT_SEPARATOR_OFFSET = 104;
const ISA_SEGMENT_TERMINATOR_OFFSET = 105;

/** @param {string} code @param {string} message @returns {ValidationError} */
function error(code, message) {
  return { code, message };
}

/** @param {string} interchange @param {string} segmentTerminator @returns {string[]} */
function segmentsFor(interchange, segmentTerminator) {
  const body = interchange.slice(0, -1);
  return body.split(segmentTerminator);
}

/** @param {string} segment @param {string} elementSeparator @returns {string[]} */
function fieldsFor(segment, elementSeparator) {
  return segment.split(elementSeparator);
}

/** @param {string[]} segment @param {number} index @returns {number | null} */
function declaredCount(segment, index) {
  const value = segment[index];
  if (value === undefined || !/^\d+$/.test(value)) {
    return null;
  }

  return Number(value);
}

/** @param {string} source @param {number} start @returns {string[]} */
function delimiterValues(source, start) {
  return [
    source[start + ISA_ELEMENT_SEPARATOR_OFFSET],
    source[start + ISA_REPETITION_SEPARATOR_OFFSET],
    source[start + ISA_COMPONENT_SEPARATOR_OFFSET],
    source[start + ISA_SEGMENT_TERMINATOR_OFFSET],
  ];
}

/** @param {string[]} delimiters @returns {boolean} */
function delimitersCollide(delimiters) {
  return new Set(delimiters).size !== delimiters.length;
}

/** @param {string} interchange @param {number} interchangeIndex @param {string} elementSeparator @param {string} segmentTerminator @returns {ValidationError[]} */
function validateEnvelope(interchange, interchangeIndex, elementSeparator, segmentTerminator) {
  const errors = [];
  const segments = segmentsFor(interchange, segmentTerminator);
  const isa = fieldsFor(segments[0], elementSeparator);
  let groupCount = 0;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = fieldsFor(segments[index], elementSeparator);
    if (segment[0] === 'GS') {
      groupCount += 1;
      const groupStart = index;
      const groupControlNumber = segment[6];
      let transactionCount = 0;
      let transactionStart = -1;
      let groupClosed = false;

      for (let groupIndex = groupStart + 1; groupIndex < segments.length; groupIndex += 1) {
        const groupSegment = fieldsFor(segments[groupIndex], elementSeparator);
        if (groupSegment[0] === 'ST') {
          transactionStart = groupIndex;
        }

        if (groupSegment[0] === 'SE' && transactionStart >= 0) {
          transactionCount += 1;
          const transactionHeader = fieldsFor(segments[transactionStart], elementSeparator);
          if (transactionHeader[2] !== groupSegment[2]) {
            errors.push(error('st-se-control-mismatch', `Interchange ${interchangeIndex + 1} has an ST/SE control-number mismatch.`));
          }

          const declaredSegmentCount = declaredCount(groupSegment, 1);
          if (declaredSegmentCount === null) {
            errors.push(error('invalid-se-segment-count', `Interchange ${interchangeIndex + 1} has a nonnumeric SE segment count.`));
          } else if (declaredSegmentCount !== groupIndex - transactionStart + 1) {
            errors.push(error('st-se-segment-count-mismatch', `Interchange ${interchangeIndex + 1} has an ST/SE segment-count mismatch.`));
          }
          transactionStart = -1;
        }

        if (groupSegment[0] === 'GE') {
          groupClosed = true;
          if (transactionStart >= 0) {
            errors.push(error('missing-se', `Interchange ${interchangeIndex + 1} has an ST segment without a matching SE segment.`));
          }
          if (groupSegment[2] !== groupControlNumber) {
            errors.push(error('gs-ge-control-mismatch', `Interchange ${interchangeIndex + 1} has a GS/GE control-number mismatch.`));
          }

          const declaredTransactionCount = declaredCount(groupSegment, 1);
          if (declaredTransactionCount === null) {
            errors.push(error('invalid-ge-transaction-count', `Interchange ${interchangeIndex + 1} has a nonnumeric GE transaction count.`));
          } else if (declaredTransactionCount !== transactionCount) {
            errors.push(error('gs-ge-transaction-count-mismatch', `Interchange ${interchangeIndex + 1} has a GS/GE transaction-count mismatch.`));
          }
          break;
        }
      }

      if (!groupClosed) {
        errors.push(error('missing-ge', `Interchange ${interchangeIndex + 1} does not contain a GE segment for its GS group.`));
      }
    }
  }

  const ieaIndex = segments.length - 1;
  const iea = fieldsFor(segments[ieaIndex], elementSeparator);
  if (isa[13] !== iea[2]) {
    errors.push(error('isa-iea-control-mismatch', `Interchange ${interchangeIndex + 1} has an ISA/IEA control-number mismatch.`));
  }

  const declaredGroupCount = declaredCount(iea, 1);
  if (declaredGroupCount === null) {
    errors.push(error('invalid-iea-group-count', `Interchange ${interchangeIndex + 1} has a nonnumeric IEA group count.`));
  } else if (declaredGroupCount !== groupCount) {
    errors.push(error('isa-iea-group-count-mismatch', `Interchange ${interchangeIndex + 1} has an ISA/IEA group-count mismatch.`));
  }

  return errors;
}

/** @param {string} source @returns {string[]} */
export function splitInterchanges(source) {
  const interchanges = [];
  let searchStart = 0;

  while (searchStart < source.length) {
    const isaStart = source.indexOf('ISA', searchStart);
    if (isaStart < 0 || source.length < isaStart + ISA_LENGTH) {
      break;
    }

    const elementSeparator = source[isaStart + ISA_ELEMENT_SEPARATOR_OFFSET];
    const segmentTerminator = source[isaStart + ISA_SEGMENT_TERMINATOR_OFFSET];
    const ieaStart = source.indexOf(
      `${segmentTerminator}IEA${elementSeparator}`,
      isaStart + ISA_LENGTH,
    );
    if (ieaStart < 0) {
      break;
    }

    const end = source.indexOf(segmentTerminator, ieaStart + 1);
    if (end < 0) {
      break;
    }

    interchanges.push(source.slice(isaStart, end + 1));
    searchStart = end + 1;
  }

  return interchanges;
}

/** @param {string} source @returns {ValidationResult} */
export function validateExample(source) {
  const isaStart = source.indexOf('ISA');
  if (isaStart < 0) {
    return { interchanges: [], errors: [error('missing-isa', 'Input does not contain an ISA segment.')] };
  }

  if (source.length < isaStart + ISA_LENGTH) {
    return { interchanges: [], errors: [error('short-isa', 'ISA segment is shorter than 106 characters through its terminator.')] };
  }

  const [elementSeparator, repetitionSeparator, componentSeparator, segmentTerminator] = delimiterValues(source, isaStart);
  if (delimitersCollide([elementSeparator, repetitionSeparator, componentSeparator, segmentTerminator])) {
    return { interchanges: [], errors: [error('delimiter-collision', 'ISA delimiters must be distinct.')] };
  }

  const interchanges = splitInterchanges(source);
  if (interchanges.length === 0) {
    return { interchanges: [], errors: [error('missing-iea', 'Interchange does not contain an IEA segment.')] };
  }

  const errors = [];
  let sourcePosition = 0;
  let hasUnconsumedInput = false;
  for (const interchange of interchanges) {
    const interchangeStart = source.indexOf(interchange, sourcePosition);
    const separator = source.slice(sourcePosition, interchangeStart);
    if (interchangeStart < 0 || (separator !== '' && separator !== '\n' && separator !== '\r\n')) {
      errors.push(error('unconsumed-input', 'Input contains bytes outside its complete interchanges.'));
      hasUnconsumedInput = true;
      break;
    }
    sourcePosition = interchangeStart + interchange.length;
  }

  let trailing = source.slice(sourcePosition);
  if (trailing === '\n' || trailing === '\r\n') {
    trailing = '';
  } else if (trailing.startsWith('\r\n')) {
    trailing = trailing.slice(2);
  } else if (trailing.startsWith('\n')) {
    trailing = trailing.slice(1);
  }

  if (!hasUnconsumedInput && trailing.length > 0) {
    const code = trailing.startsWith('ISA') ? 'truncated-isa' : 'unconsumed-input';
    const message = code === 'truncated-isa'
      ? 'Input ends with a truncated ISA interchange.'
      : 'Input contains bytes outside its complete interchanges.';
    errors.push(error(code, message));
  }

  for (let index = 0; index < interchanges.length; index += 1) {
    const interchange = interchanges[index];
    const [interchangeElementSeparator, interchangeRepetitionSeparator, interchangeComponentSeparator, interchangeSegmentTerminator] = delimiterValues(interchange, 0);
    if (delimitersCollide([
      interchangeElementSeparator,
      interchangeRepetitionSeparator,
      interchangeComponentSeparator,
      interchangeSegmentTerminator,
    ])) {
      errors.push(error('delimiter-collision', `Interchange ${index + 1} has colliding ISA delimiters.`));
      continue;
    }

    errors.push(...validateEnvelope(interchange, index, interchangeElementSeparator, interchangeSegmentTerminator));
  }

  return { interchanges, errors };
}
