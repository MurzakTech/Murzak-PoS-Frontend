/**
 * Words for units by industry (ticket P7-2): the picker's extras, the "Your units" dialog, and the plain words of the
 * units each kind of shop counts in. A unit's stored name (lower case) maps to [one, many]. The stored values are not
 * words to read; unitWords shows the plain word.
 */
const units = {
  picker: {
    manage: 'Add or change units',
    usualFor: 'Usual units for {shop} come first',
  },
  dialog: {
    title: 'Your units',
    description: 'Choose the kind of shop you run, so its usual units come first, or add a unit of your own.',
    industry: 'Kind of shop',
    industryHelper: 'This only changes which units are shown first. No unit is removed.',
    addHeading: 'Add your own unit',
    name: 'Unit name',
    namePlaceholder: 'For example jerrycan',
    plural: 'Word for many',
    pluralPlaceholder: 'For example jerrycans',
    pluralHelper: 'How you say it for more than one, such as 3 jerrycans.',
    parts: 'Can be sold in parts, such as 2.5 of it',
    add: 'Add unit',
    close: 'Done',
    added: '{name} was added.',
    industrySaved: 'Usual units changed.',
    loadFailed: 'We could not load your units. Please try again.',
    needName: 'Please type the unit name.',
    needPlural: 'Please type the word for many.',
    tooShort: 'A unit needs at least two letters.',
    tooLong: 'A unit can be at most 30 characters.',
    badCharacters: 'Use letters, numbers, spaces, hyphens or full stops only.',
    repeat: 'There is already a unit called {name}.',
  },
  industries: {
    pharmacy: 'Pharmacy or clinic shop',
    restaurant: 'Restaurant, cafe or bar',
    hotel: 'Hotel or guest house',
    butchery_groceries: 'Butchery or groceries',
    hardware: 'Hardware',
    services: 'Salon or services',
    wholesale: 'Wholesale',
    retail: 'General shop',
    agriculture: 'Farm or agrovet',
  },
  // Plain words for the units of the curated lists that the earlier list did not have
  words: {
    tablet: ['tablet', 'tablets'],
    capsule: ['capsule', 'capsules'],
    strip: ['strip', 'strips'],
    vial: ['vial', 'vials'],
    tonne: ['tonne', 'tonnes'],
    ton: ['tonne', 'tonnes'],
    tons: ['tonne', 'tonnes'],
    tonnes: ['tonne', 'tonnes'],
    carcass: ['carcass', 'carcasses'],
    tot: ['tot', 'tots'],
    night: ['night', 'nights'],
    person: ['person', 'people'],
    people: ['person', 'people'],
    pallet: ['pallet', 'pallets'],
    bale: ['bale', 'bales'],
  },
};

export default units;
