// The ISA is fixed width: 106 characters including its terminator.
export const ISA_LENGTH = 106;
export const ISA_ELEMENT_SEPARATOR_OFFSET = 3;

// Offsets, from the start of `ISA`, of the element separators between its 16 elements.
export const ISA_SEPARATOR_OFFSETS = [3, 6, 17, 20, 31, 34, 50, 53, 69, 76, 81, 83, 89, 99, 101, 103];
export const ISA_REPETITION_OFFSET = 82;
export const ISA_VERSION_START = 84;
export const ISA_VERSION_END = 89;
export const ISA_COMPONENT_OFFSET = 104;
export const ISA_TERMINATOR_OFFSET = 105;

// ISA11 holds the repetition separator from this version on.
export const FIRST_VERSION_WITH_REPETITION = '00501';

// Allowed around interchanges. A byte order mark is also allowed at offset 0.
export const IGNORABLE_CHARACTERS = ' \t\r\n\u{1A}\u{0}';
export const BYTE_ORDER_MARK = '\u{FEFF}';

export const LETTER_OR_DIGIT = /^[A-Za-z0-9]$/;
export const DIGITS_ONLY = /^\d+$/;

// How much of the unexpected text an `unexpected-data` message quotes.
export const UNEXPECTED_TEXT_PREVIEW_LENGTH = 20;
