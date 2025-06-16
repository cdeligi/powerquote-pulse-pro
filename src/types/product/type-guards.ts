
import { Chassis, Card, Level1Product } from './interfaces';

export function isLevel1Product(product: Chassis | Card | Level1Product): product is Level1Product {
  return 'productInfoUrl' in product && typeof (product as Level1Product).productInfoUrl === 'string';
}

export function isChassis(product: Chassis | Card | Level1Product): product is Chassis {
  return 'slots' in product;
}

export function isCard(product: Chassis | Card | Level1Product): product is Card {
  return 'slotRequirement' in product;
}
