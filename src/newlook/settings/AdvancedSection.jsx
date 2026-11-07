import React from 'react';
import { ADVANCED_CARDS, cardAddress, cardFromSearch } from './settingsModel';
import LinkList from './LinkList';
import useSettingsUser from './useSettingsUser';
import T from './strings.settings';

// Listed here and under Till and payments, so an owner who looks in either place finds it
const ALSO_UNDER_TILL = new Set(['inventory-discounts', 'loyalty-programs']);

/**
 * Settings, Advanced (ticket P5-3): a list of the less common settings, each with one plain sentence and a button that
 * opens its current screen. ?section=<name> (the names the old addresses redirect to) outlines that card and brings it
 * into view. The industry starter products need the shop's type; without it the card says so.
 */
const AdvancedSection = ({ search = '' }) => {
  const { user } = useSettingsUser();
  const wanted = cardFromSearch(search);
  const items = ADVANCED_CARDS.map((card) => {
    const words = T.advanced.cards[card.section];
    const to = cardAddress(card, user);
    const note = !to ? T.advanced.industryMissing : ALSO_UNDER_TILL.has(card.section) ? T.shell.alsoUnderTill : '';
    return { key: card.section, title: words.title, text: words.text, note, to };
  });
  return <LinkList id="advanced" title={T.advanced.listTitle} subtitle={T.advanced.listSubtitle} items={items} highlightKey={wanted} />;
};

export default AdvancedSection;
