import { describe, it, expect } from '@jest/globals';

type Flower = {
  name: string;
  nameUk?: string;
  nameSv?: string;
  description: string | null;
  descriptionUk?: string | null;
  descriptionSv?: string | null;
};

function getLocalizedFlower(flower: Flower, locale: string) {
  let name = flower.name;
  let description = flower.description;
  if (locale === 'uk' && flower.nameUk) name = flower.nameUk;
  if (locale === 'sv' && flower.nameSv) name = flower.nameSv;
  if (locale === 'uk' && flower.descriptionUk) description = flower.descriptionUk;
  if (locale === 'sv' && flower.descriptionSv) description = flower.descriptionSv;
  return { name, description };
}

describe('getLocalizedFlower', () => {
  const flower: Flower = {
    name: 'Rose',
    nameUk: 'Троянда',
    nameSv: 'Ros',
    description: 'A beautiful flower',
    descriptionUk: 'Гарна квітка',
    descriptionSv: 'Vacker blomma',
  };

  it('returns English by default', () => {
    const result = getLocalizedFlower(flower, 'en');
    expect(result.name).toBe('Rose');
    expect(result.description).toBe('A beautiful flower');
  });

  it('returns Ukrainian if locale is uk', () => {
    const result = getLocalizedFlower(flower, 'uk');
    expect(result.name).toBe('Троянда');
    expect(result.description).toBe('Гарна квітка');
  });

  it('returns Swedish if locale is sv', () => {
    const result = getLocalizedFlower(flower, 'sv');
    expect(result.name).toBe('Ros');
    expect(result.description).toBe('Vacker blomma');
  });
});
