import React, { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import { getShop, ShopNotFoundError } from '../../api/storefrontApi';
import { cartCount, cartReducer, cartSubtotal, loadCart, saveCart } from './cart';
import { applyShopMeta, logoUrl } from './shopMeta';
import useLanguage from './useLanguage';

const ShopContext = createContext(null);

/** Everything the shop's pages share: the shop itself, the shopper's language, and their basket. */
export const useShop = () => {
  const value = useContext(ShopContext);
  if (!value) throw new Error('useShop must be used inside a ShopProvider.');
  return value;
};

/**
 * status: 'loading' | 'ready' | 'closed' (no such shop, or its online store is off) | 'error' (could not be reached)
 */
export const ShopProvider = ({ slug, children }) => {
  const { language, setLanguage, t } = useLanguage();
  const [shop, setShop] = useState(null);
  const [status, setStatus] = useState('loading');
  const [cart, dispatch] = useReducer(cartReducer, slug, loadCart);
  const latest = useRef(0);

  useEffect(() => {
    saveCart(slug, cart);
  }, [slug, cart]);

  // The shop's name, line and logo in the tab and the share tags
  useEffect(() => {
    if (status !== 'ready' || !shop) return undefined;
    return applyShopMeta({
      title: shop.store_name,
      description: shop.tagline,
      image: logoUrl(shop.logo),
      url: window.location.href,
    });
  }, [status, shop]);

  const load = useCallback(async () => {
    const id = ++latest.current;
    setStatus('loading');
    try {
      const data = await getShop(slug);
      if (id !== latest.current) return;
      setShop(data);
      setStatus('ready');
    } catch (error) {
      if (id !== latest.current) return;
      setStatus(error instanceof ShopNotFoundError ? 'closed' : 'error');
    }
  }, [slug]);

  useEffect(() => {
    load();
    return () => {
      latest.current += 1;
    };
  }, [load]);

  const value = useMemo(
    () => ({
      slug,
      shop,
      status,
      reload: load,
      language,
      setLanguage,
      t,
      cart,
      dispatch,
      count: cartCount(cart),
      subtotal: cartSubtotal(cart),
    }),
    [slug, shop, status, load, language, setLanguage, t, cart]
  );

  return <ShopContext.Provider value={value}>{children}</ShopContext.Provider>;
};

/** A small local flag for a dialog or panel opening and closing. */
export const useToggle = (initial = false) => {
  const [on, setOn] = useState(initial);
  return [on, useCallback(() => setOn(true), []), useCallback(() => setOn(false), [])];
};

export default ShopProvider;
