import React from 'react';
import { ADVANCED_CARDS, cardAddress, cardFromSearch } from './settingsModel';
import LinkList from './LinkList';
import useSettingsUser from './useSettingsUser';
import T from './strings.settings';

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
    return { key: card.section, title: words.title, text: words.text, note: to ? '' : T.advanced.industryMissing, to };
  });
  return <LinkList id="advanced" title={T.advanced.listTitle} subtitle={T.advanced.listSubtitle} items={items} highlightKey={wanted} />;
};

export default AdvancedSection;
