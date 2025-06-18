
import { Chassis, Card, Level1Product, Level2Product, Level3Product } from './interfaces';

export function isLevel1Product(product: Chassis | Card | Level1Product | Level2Product | Level3Product): product is Level1Product {
  return 'productInfoUrl' in product && (!('parentProductId' in product)) && 
    (!product.type || ['QTMS', 'TM8', 'TM3', 'TM1', 'QPDM'].includes(product.type));
}

export function isChassis(product: Chassis | Card | Level1Product | Level2Product | Level3Product): product is Chassis {
  return 'slots' in product && 'height' in product;
}

export function isCard(product: Chassis | Card | Level1Product | Level2Product | Level3Product): product is Card {
  return 'slotRequirement' in product && 'compatibleChassis' in product;
}

export function isLevel2Product(product: Level1Product | Level2Product | Level3Product): product is Level2Product {
  return 'parentProductId' in product && !('slotRequirement' in product) && 
    ['LTX', 'MTX', 'STX', 'CalGas', 'Moisture', 'Standard'].includes((product as Level2Product).type);
}

export function isLevel3Product(product: Level1Product | Level2Product | Level3Product): product is Level3Product {
  return 'parentProductId' in product && 
    ['relay', 'analog', 'fiber', 'display', 'bushing', 'accessory', 'sensor'].includes((product as Level3Product).type);
}
