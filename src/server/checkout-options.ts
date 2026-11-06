import { loadCoefficientTable, loadPriceLists, loadVatRates } from '@/data/load';
import { listPriceOn } from '@/domain/price-list';
import { listAssets } from './assets';
import { db } from './db';

export async function checkoutOptions(today: string) {
  const [assets, prices, table, vat] = await Promise.all([
    listAssets(db),
    loadPriceLists(),
    loadCoefficientTable(),
    loadVatRates(),
  ]);
  const options = assets.flatMap((asset) => {
    const price = listPriceOn(prices, asset.id, today);
    if (!price.ok) return [];
    return [
      {
        id: asset.id,
        category: asset.category,
        name: `${asset.make} ${asset.model}`,
        available: asset.status === 'available',
        priceCents: price.priceCents,
        priceListVersion: price.priceListVersion,
      },
    ];
  });
  return { options, table, rates: vat.rates, today };
}
export type CheckoutData = Awaited<ReturnType<typeof checkoutOptions>>;
