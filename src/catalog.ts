export type Product = {
  id: string;
  name: string;
  en: string;
  category: string;
  price: number;
  old: number;
  image: string;
  tag: string;
  options: string[];
  description: string;
  stock?: number;
  imageUrl?: string;
  images?: string[];
  seller?: string;
};
export const products: Product[] = [
  {
    id: 'tote',
    name: '에브리데이 코튼 토트백',
    en: 'Everyday cotton tote',
    category: '패션',
    price: 1890,
    old: 2400,
    image: 'photo-1639450258509-d24e3e1fadc4',
    tag: 'EDITOR’S PICK',
    options: ['내추럴'],
    description:
      '가볍게 들기 좋은 데일리 토트백. 심플한 스타일로 일상의 다양한 순간에 어울립니다.',
  },
  {
    id: 'notebook',
    name: '데일리 스프링 노트',
    en: 'Daily spiral notebook',
    category: '문구',
    price: 1250,
    old: 1600,
    image: 'photo-1598620616337-cb8f766489bd',
    tag: 'NEW ARRIVAL',
    options: ['화이트'],
    description: '새로운 생각과 오늘의 기록을 담는 스프링 노트입니다.',
  },
  {
    id: 'mug',
    name: '모닝 세라믹 머그',
    en: 'Morning ceramic mug',
    category: '리빙',
    price: 1590,
    old: 1990,
    image: 'photo-1514228742587-6b1558fcca3d',
    tag: 'DAILY ESSENTIAL',
    options: ['화이트'],
    description: '차분한 아침을 위한 심플한 세라믹 머그입니다.',
  },
  {
    id: 'skincare',
    name: '데일리 스킨케어 셀렉션',
    en: 'Daily skincare selection',
    category: '뷰티',
    price: 2890,
    old: 3500,
    image: 'photo-1580680849706-3427cab9e6d7',
    tag: 'BEAUTY EDIT',
    options: ['기본 구성'],
    description:
      '매일의 케어 루틴을 위한 셀렉션. 실제 판매 전 성분·구성 및 국가별 반입 조건을 확정합니다.',
  },
  {
    id: 'audio',
    name: '오버이어 헤드폰',
    en: 'Over-ear headphones',
    category: '디지털',
    price: 4990,
    old: 5990,
    image: 'photo-1742783637429-2452a4caee8c',
    tag: 'LIFESTYLE',
    options: ['화이트'],
    description:
      '음악과 함께하는 일상을 위한 오버이어 스타일. 실제 판매 전 제품 사양을 확정합니다.',
  },
  {
    id: 'vase',
    name: '오브제 세라믹 화병',
    en: 'Object ceramic vase',
    category: '리빙',
    price: 2290,
    old: 2800,
    image: 'photo-1687191883721-257d8cad5b54',
    tag: 'HOME EDIT',
    options: ['화이트'],
    description: '공간에 조용한 포인트를 더하는 화병입니다.',
  },
];
export const photo = (p: Product) => p.imageUrl || `./products/${p.id}.jpg`;
export const money = (n: number) => `S$${(n / 100).toFixed(2)}`;
