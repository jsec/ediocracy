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

/** @param {string[]} segment @param {number} index @returns {number | null} */
function declaredCount(segment, index) {
  const value = segment[index];
  if (value === undefined || !/^\d+$/.test(value)) {
    return null;
  }

  return Number(value);
}

/** @param {string} source @param {number} isaStart @returns {boolean} */
function delimitersCollide(source, isaStart) {
  const delimiters = new Set([
    source[isaStart + ISA_ELEMENT_SEPARATOR_OFFSET],
    source[isaStart + ISA_REPETITION_SEPARATOR_OFFSET],
    source[isaStart + ISA_COMPONENT_SEPARATOR_OFFSET],
    source[isaStart + ISA_SEGMENT_TERMINATOR_OFFSET],
  ]);
  return delimiters.size !== 4;
}

/** @param {string} interchange @param {number} interchangeIndex @returns {ValidationError[]} */
function validateEnvelope(interchange, interchangeIndex) {
  const errors = [];
  const elementSeparator = interchange[ISA_ELEMENT_SEPARATOR_OFFSET];
  const segments = interchange.slice(0, -1).split(interchange[ISA_SEGMENT_TERMINATOR_OFFSET]);
  let groupCount = 0;

  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index].split(elementSeparator);
    if (segment[0] === 'GS') {
      groupCount += 1;
      const groupControlNumber = segment[6];
      let transactionCount = 0;
      let transactionStart = -1;
      let groupClosed = false;

      for (let groupIndex = index + 1; groupIndex < segments.length; groupIndex += 1) {
        const groupSegment = segments[groupIndex].split(elementSeparator);
        if (groupSegment[0] === 'ST') {
          transactionStart = groupIndex;
        }

        if (groupSegment[0] === 'SE' && transactionStart >= 0) {
          transactionCount += 1;
          const transactionHeader = segments[transactionStart].split(elementSeparator);
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

  const isa = segments[0].split(elementSeparator);
  const iea = segments[segments.length - 1].split(elementSeparator);
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

  if (delimitersCollide(source, isaStart)) {
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

  const trailing = source.slice(sourcePosition).replace(/^\r?\n/, '');
  if (!hasUnconsumedInput && trailing.length > 0) {
    if (trailing.startsWith('ISA')) {
      errors.push(error('truncated-isa', 'Input ends with a truncated ISA interchange.'));
    } else {
      errors.push(error('unconsumed-input', 'Input contains bytes outside its complete interchanges.'));
    }
  }

  for (let index = 0; index < interchanges.length; index += 1) {
    if (delimitersCollide(interchanges[index], 0)) {
      errors.push(error('delimiter-collision', `Interchange ${index + 1} has colliding ISA delimiters.`));
      continue;
    }

    errors.push(...validateEnvelope(interchanges[index], index));
  }

  return { interchanges, errors };
}
