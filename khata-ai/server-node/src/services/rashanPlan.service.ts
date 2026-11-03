import { Types } from 'mongoose';
import { RashanMonthlyPlan, IRashanMonthlyPlan, IRashanItem, RashanCategory, RashanUnit } from '../models/RashanPlan';
import { LedgerEntry } from '../models/LedgerEntry';

export interface IEnrichedRashanItem extends IRashanItem {
  id: string;
  estimatedTotal: number;
  actualTotal: number;
  variance: number;
  isDeficit: boolean;
  variancePercentage: number;
}

export interface IRashanPlanResponse {
  planId: string;
  month: number;
  year: number;
  monthKey: string;
  householdSize: number;
  status: 'PLANNING' | 'IN_PROGRESS' | 'RECONCILED';
  reconciledAt?: Date;
  paymentMethod?: string;
  totalEstimatedBudget: number; // Sum of items (targetQty * estimatedUnitRate)
  customTargetBudget?: number; // User-defined target budget cap if set
  effectiveBudget: number; // customTargetBudget > 0 ? customTargetBudget : totalEstimatedBudget
  totalActualSpent: number;
  netVariance: number; // totalActualSpent - effectiveBudget (positive = deficit, negative = surplus/saved)
  envelopePercentageUsed: number;
  remainingBudget: number;
  totalItemsCount: number;
  purchasedItemsCount: number;
  deficitItemsCount: number;
  items: IEnrichedRashanItem[];
  whatsAppText: string;
}

export interface ICatalogStaple {
  id: string;
  nameUrdu: string;
  nameEnglish: string;
  category: RashanCategory;
  defaultQty: number;
  unit: RashanUnit;
  defaultRate: number;
  notes?: string;
}

export const STAPLE_CATALOG: ICatalogStaple[] = [
  // 1. Grains & Flours
  { id: 'cat-atta', nameUrdu: 'آٹا فائن / چکی', nameEnglish: 'Wheat Flour (Atta)', category: 'GRAIN', defaultQty: 20, unit: 'KG', defaultRate: 140, notes: '20 کلو تھیلا' },
  { id: 'cat-rice-super', nameUrdu: 'چاول کائنات سپر باسمتی', nameEnglish: 'Super Basmati Rice', category: 'GRAIN', defaultQty: 5, unit: 'KG', defaultRate: 340, notes: 'پرانا کائنات چاول' },
  { id: 'cat-rice-sella', nameUrdu: 'چاول سیلا کائنات', nameEnglish: 'Sella Basmati Rice', category: 'GRAIN', defaultQty: 5, unit: 'KG', defaultRate: 290, notes: 'پلاؤ و دیگی چاول' },
  { id: 'cat-besan', nameUrdu: 'بیسن خالص چنا', nameEnglish: 'Gram Flour (Besan)', category: 'GRAIN', defaultQty: 2, unit: 'KG', defaultRate: 260, notes: 'پکوڑے و سالن کے لیے' },
  { id: 'cat-maida', nameUrdu: 'میدہ فائن', nameEnglish: 'All-Purpose Flour (Maida)', category: 'GRAIN', defaultQty: 2, unit: 'KG', defaultRate: 160, notes: 'بیکنگ و پراٹھے' },
  { id: 'cat-suji', nameUrdu: 'سوجی خالص', nameEnglish: 'Semolina (Suji)', category: 'GRAIN', defaultQty: 1, unit: 'KG', defaultRate: 180, notes: 'حلوہ و ناشتہ' },
  { id: 'cat-daliya', nameUrdu: 'دلیہ گندم و جو', nameEnglish: 'Wheat / Barley Porridge (Daliya)', category: 'GRAIN', defaultQty: 1, unit: 'KG', defaultRate: 220, notes: 'صحت بخش ناشتہ' },
  { id: 'cat-seviyan', nameUrdu: 'باریک سویاں', nameEnglish: 'Vermicelli (Seviyan)', category: 'GRAIN', defaultQty: 2, unit: 'PACK', defaultRate: 120, notes: 'میٹھی سویاں' },

  // 2. Oils & Fats
  { id: 'cat-oil-5l', nameUrdu: 'کوکنگ آئل 5 لیٹر پاؤچ / کین', nameEnglish: 'Cooking Oil (5L Pouch)', category: 'OIL_GHEE', defaultQty: 5, unit: 'LITRE', defaultRate: 490, notes: 'معیاری برانڈ پاؤچ یا کین' },
  { id: 'cat-ghee-1kg', nameUrdu: 'بناسپتی گھی 1 کلو', nameEnglish: 'Banaspati Ghee (1kg)', category: 'OIL_GHEE', defaultQty: 2, unit: 'KG', defaultRate: 480, notes: 'پراٹھے و تڑکا' },
  { id: 'cat-mustard-oil', nameUrdu: 'سرسوں کا خالص تیل', nameEnglish: 'Mustard Oil (Sarson Ka Tail)', category: 'OIL_GHEE', defaultQty: 1, unit: 'LITRE', defaultRate: 520, notes: 'اچار و سالن' },
  { id: 'cat-desi-ghee', nameUrdu: 'دیسی گھی خالص', nameEnglish: 'Pure Desi Ghee', category: 'OIL_GHEE', defaultQty: 1, unit: 'KG', defaultRate: 2400, notes: 'گھر کا دیسی گھی' },

  // 3. Sweeteners & Breakfast
  { id: 'cat-sugar', nameUrdu: 'چینی سفید صاف', nameEnglish: 'White Sugar (Cheeni)', category: 'SWEETENER', defaultQty: 5, unit: 'KG', defaultRate: 155, notes: 'ماہانہ میٹھا و چائے' },
  { id: 'cat-chai', nameUrdu: 'دانے دار چائے پتی', nameEnglish: 'Danedar Chai Patti', category: 'SWEETENER', defaultQty: 1, unit: 'PACK', defaultRate: 1650, notes: '900 گرام فیملی پیک' },
  { id: 'cat-dry-milk', nameUrdu: 'خشک دودھ پاؤڈر (نیڈو/ایوری ڈے)', nameEnglish: 'Dry Milk Powder', category: 'SWEETENER', defaultQty: 1, unit: 'PACK', defaultRate: 1450, notes: 'چائے و بچوں کے لیے' },
  { id: 'cat-rusk', nameUrdu: 'پاپے / رسک فیملی پیک', nameEnglish: 'Tea Rusk / Toast', category: 'SWEETENER', defaultQty: 2, unit: 'PACK', defaultRate: 180, notes: 'شام کی چائے' },
  { id: 'cat-honey', nameUrdu: 'خالص شہد', nameEnglish: 'Pure Natural Honey', category: 'SWEETENER', defaultQty: 1, unit: 'PACK', defaultRate: 950, notes: 'ناشتہ و کھانسی' },

  // 4. Pulses & Beans
  { id: 'cat-daal-chana', nameUrdu: 'دال چنا سپیشل', nameEnglish: 'Daal Chana Special', category: 'PULSE', defaultQty: 2, unit: 'KG', defaultRate: 260, notes: 'سالن و پلاؤ' },
  { id: 'cat-daal-moong', nameUrdu: 'دال مونگ دھلی', nameEnglish: 'Daal Moong Washed', category: 'PULSE', defaultQty: 1, unit: 'KG', defaultRate: 310, notes: 'کھچڑی و دال' },
  { id: 'cat-daal-masoor', nameUrdu: 'دال مسور ثابت / دھلی', nameEnglish: 'Daal Masoor Special', category: 'PULSE', defaultQty: 1, unit: 'KG', defaultRate: 290, notes: 'تڑکا دال' },
  { id: 'cat-daal-mash', nameUrdu: 'دال ماش دھلی سپر', nameEnglish: 'Daal Mash Premium', category: 'PULSE', defaultQty: 1, unit: 'KG', defaultRate: 480, notes: 'فرائی دال ماش' },
  { id: 'cat-safaid-chana', nameUrdu: 'سفید چنے کابلی باریک', nameEnglish: 'White Chickpeas (Safaid Chana)', category: 'PULSE', defaultQty: 2, unit: 'KG', defaultRate: 380, notes: 'چھولے و چنا چاٹ' },
  { id: 'cat-kala-chana', nameUrdu: 'کالے چنے دیسی', nameEnglish: 'Black Chickpeas (Kala Chana)', category: 'PULSE', defaultQty: 1, unit: 'KG', defaultRate: 280, notes: 'شوربہ و چاٹ' },
  { id: 'cat-lobia', nameUrdu: 'سرخ لوبیا راجما', nameEnglish: 'Red Kidney Beans (Lobia)', category: 'PULSE', defaultQty: 1, unit: 'KG', defaultRate: 360, notes: 'راجما چاول' },

  // 5. Spices & Condiments
  { id: 'cat-salt', nameUrdu: 'آیوڈین ملا نمک', nameEnglish: 'Iodized Table Salt', category: 'SPICE', defaultQty: 2, unit: 'PACK', defaultRate: 65, notes: '800 گرام پیکٹ' },
  { id: 'cat-masala-mix', nameUrdu: 'مکس مصالحہ جات و گرم مصالحہ', nameEnglish: 'Mixed Spices & Garam Masala', category: 'SPICE', defaultQty: 1, unit: 'PACK', defaultRate: 850, notes: 'گرائنڈڈ فیملی پیک' },
  { id: 'cat-haldi', nameUrdu: 'ہلدی پاؤڈر خالص', nameEnglish: 'Pure Turmeric (Haldi)', category: 'SPICE', defaultQty: 1, unit: 'PACK', defaultRate: 260, notes: '250 گرام پیک' },
  { id: 'cat-red-chilli', nameUrdu: 'سرخ مرچ پاؤڈر', nameEnglish: 'Red Chilli Powder', category: 'SPICE', defaultQty: 1, unit: 'PACK', defaultRate: 380, notes: '500 گرام پیک' },
  { id: 'cat-dhaniya', nameUrdu: 'پسا خشک دھنیا', nameEnglish: 'Coriander Powder (Dhaniya)', category: 'SPICE', defaultQty: 1, unit: 'PACK', defaultRate: 250, notes: '500 گرام پیک' },
  { id: 'cat-zeera', nameUrdu: 'سفید زیرہ صاف', nameEnglish: 'Cumin Seeds (Zeera)', category: 'SPICE', defaultQty: 1, unit: 'PACK', defaultRate: 450, notes: 'تڑکا زیرہ' },
  { id: 'cat-black-pepper', nameUrdu: 'کالی مرچ ثابت و پسی', nameEnglish: 'Black Pepper (Kaali Mirch)', category: 'SPICE', defaultQty: 1, unit: 'PACK', defaultRate: 350, notes: '100 گرام پیک' },
  { id: 'cat-biryani-masala', nameUrdu: 'بریانی / قورمہ مصالحہ پیکٹ', nameEnglish: 'Biryani / Qorma Masala Pack', category: 'SPICE', defaultQty: 2, unit: 'PACK', defaultRate: 130, notes: 'نیشنل یا شان' },
  { id: 'cat-ginger-garlic', nameUrdu: 'ادرک لہسن پیسٹ بوتل', nameEnglish: 'Ginger Garlic Paste', category: 'SPICE', defaultQty: 1, unit: 'PACK', defaultRate: 320, notes: 'تازہ پیسٹ' },
  { id: 'cat-sauces', nameUrdu: 'سرکہ و سویا ساس بوتل', nameEnglish: 'Vinegar & Soy Sauce', category: 'SPICE', defaultQty: 2, unit: 'PACK', defaultRate: 160, notes: 'چائنیز و رائتہ' },

  // 6. Cleaning & Hygiene
  { id: 'cat-surf', nameUrdu: 'واشنگ پاؤڈر (سرف)', nameEnglish: 'Washing Powder (Surf)', category: 'CLEANING', defaultQty: 2, unit: 'PACK', defaultRate: 550, notes: '1 کلو پیکٹ' },
  { id: 'cat-dish-soap', nameUrdu: 'برتن دھونے کا صابن / لیکوئڈ', nameEnglish: 'Dishwashing Soap / Bar', category: 'CLEANING', defaultQty: 3, unit: 'PACK', defaultRate: 80, notes: 'لیموں میکس بار' },
  { id: 'cat-bath-soap', nameUrdu: 'نہانے کا صابن (ڈیٹول/لکس)', nameEnglish: 'Bath Soap Bars', category: 'CLEANING', defaultQty: 4, unit: 'PACK', defaultRate: 130, notes: 'فیملی صابن' },
  { id: 'cat-toothpaste', nameUrdu: 'ٹوتھ پیسٹ فیملی پیک', nameEnglish: 'Toothpaste (Family Pack)', category: 'CLEANING', defaultQty: 1, unit: 'PACK', defaultRate: 280, notes: 'کولگیٹ یا سینسوڈائن' },
  { id: 'cat-shampoo', nameUrdu: 'شیمپو فیملی بوتل', nameEnglish: 'Shampoo Family Bottle', category: 'CLEANING', defaultQty: 1, unit: 'PACK', defaultRate: 650, notes: '400 ملی لیٹر' },
  { id: 'cat-harpic', nameUrdu: 'ہارپک / ٹوائلٹ کلینر', nameEnglish: 'Toilet Cleaner (Harpic)', category: 'CLEANING', defaultQty: 1, unit: 'PACK', defaultRate: 380, notes: 'باتھ روم کلینر' },
  { id: 'cat-phenyl', nameUrdu: 'فرش کلینر و فینائل', nameEnglish: 'Floor Cleaner / Phenyl', category: 'CLEANING', defaultQty: 1, unit: 'LITRE', defaultRate: 240, notes: 'مکھیاں و جراثیم کش' },
  { id: 'cat-scrubbers', nameUrdu: 'برتن دھونے کی جالی و سپنج', nameEnglish: 'Scrub Pads & Sponge', category: 'CLEANING', defaultQty: 3, unit: 'PACK', defaultRate: 60, notes: 'سکاچ برائیٹ' },
  { id: 'cat-tissues', nameUrdu: 'کچن ٹشو رول', nameEnglish: 'Kitchen Paper Towel Roll', category: 'CLEANING', defaultQty: 2, unit: 'PACK', defaultRate: 220, notes: 'آئل جذب کرنے کے لیے' },
  { id: 'cat-matches', nameUrdu: 'ماچس کی ڈبیاں (10 پیک)', nameEnglish: 'Safety Matchboxes (10 Pack)', category: 'CLEANING', defaultQty: 1, unit: 'PACK', defaultRate: 120, notes: 'چولہا جلانے کے لیے' },
];

export class RashanPlanService {
  /**
   * Generates default staples scaled by household size
   */
  static getDefaultStaples(householdSize: number = 5): IRashanItem[] {
    const scale = Math.max(0.6, householdSize / 5);

    const roundQty = (base: number) => {
      const val = base * scale;
      return val >= 10 ? Math.round(val / 5) * 5 : Math.round(val * 2) / 2;
    };

    return [
      {
        nameUrdu: 'آٹا فائن / چکی',
        nameEnglish: 'Wheat Flour (Atta)',
        category: 'GRAIN',
        targetQty: Math.max(10, roundQty(20)),
        unit: 'KG',
        estimatedUnitRate: 140,
        isPurchased: false,
        notes: '20 کلو تھیلا یا چکی کا تازہ آٹا',
      },
      {
        nameUrdu: 'چاول کائنات سپر باسمتی',
        nameEnglish: 'Super Basmati Rice',
        category: 'GRAIN',
        targetQty: Math.max(2, roundQty(5)),
        unit: 'KG',
        estimatedUnitRate: 340,
        isPurchased: false,
        notes: 'پرانا کائنات چاول برائے پلاؤ و بریانی',
      },
      {
        nameUrdu: 'بیسن خالص چنا',
        nameEnglish: 'Gram Flour (Besan)',
        category: 'GRAIN',
        targetQty: Math.max(1, roundQty(2)),
        unit: 'KG',
        estimatedUnitRate: 260,
        isPurchased: false,
        notes: 'پکوڑے و سالن کے لیے',
      },
      {
        nameUrdu: 'کوکنگ آئل (5 لیٹر پاؤچ / کین)',
        nameEnglish: 'Cooking Oil (5L Pouch)',
        category: 'OIL_GHEE',
        targetQty: Math.max(2, roundQty(5)),
        unit: 'LITRE',
        estimatedUnitRate: 490,
        isPurchased: false,
        notes: 'معیاری برانڈ پاؤچ یا کین',
      },
      {
        nameUrdu: 'بناسپتی گھی',
        nameEnglish: 'Banaspati Ghee',
        category: 'OIL_GHEE',
        targetQty: Math.max(1, roundQty(2)),
        unit: 'KG',
        estimatedUnitRate: 480,
        isPurchased: false,
        notes: 'پراٹھے و تڑکا کے لیے',
      },
      {
        nameUrdu: 'چینی سفید صاف',
        nameEnglish: 'White Sugar (Cheeni)',
        category: 'SWEETENER',
        targetQty: Math.max(2, roundQty(5)),
        unit: 'KG',
        estimatedUnitRate: 155,
        isPurchased: false,
        notes: 'ماہانہ میٹھا و چائے کا استعمال',
      },
      {
        nameUrdu: 'دانے دار چائے پتی',
        nameEnglish: 'Danedar Chai Patti',
        category: 'SWEETENER',
        targetQty: Math.max(1, Math.round(scale)),
        unit: 'PACK',
        estimatedUnitRate: 1650,
        isPurchased: false,
        notes: '900 گرام فیملی پیک',
      },
      {
        nameUrdu: 'خشک دودھ پاؤڈر (نیڈو/ایوری ڈے)',
        nameEnglish: 'Dry Milk Powder',
        category: 'SWEETENER',
        targetQty: 1,
        unit: 'PACK',
        estimatedUnitRate: 1450,
        isPurchased: false,
        notes: 'چائے و کھیر کے لیے',
      },
      {
        nameUrdu: 'آیوڈین ملا نمک',
        nameEnglish: 'Iodized Table Salt',
        category: 'SPICE',
        targetQty: 2,
        unit: 'PACK',
        estimatedUnitRate: 65,
        isPurchased: false,
        notes: '800 گرام پیکٹ',
      },
      {
        nameUrdu: 'ہلدی پاؤڈر خالص',
        nameEnglish: 'Pure Turmeric (Haldi)',
        category: 'SPICE',
        targetQty: 1,
        unit: 'PACK',
        estimatedUnitRate: 260,
        isPurchased: false,
      },
      {
        nameUrdu: 'سرخ مرچ پاؤڈر',
        nameEnglish: 'Red Chilli Powder',
        category: 'SPICE',
        targetQty: 1,
        unit: 'PACK',
        estimatedUnitRate: 380,
        isPurchased: false,
      },
      {
        nameUrdu: 'پسا خشک دھنیا',
        nameEnglish: 'Coriander Powder (Dhaniya)',
        category: 'SPICE',
        targetQty: 1,
        unit: 'PACK',
        estimatedUnitRate: 250,
        isPurchased: false,
      },
      {
        nameUrdu: 'مکس مصالحہ جات و گرم مصالحہ',
        nameEnglish: 'Mixed Spices & Halmi',
        category: 'SPICE',
        targetQty: 1,
        unit: 'PACK',
        estimatedUnitRate: 850,
        isPurchased: false,
      },
      {
        nameUrdu: 'دال چنا باریک / سپیشل',
        nameEnglish: 'Daal Chana Special',
        category: 'PULSE',
        targetQty: Math.max(1, roundQty(2)),
        unit: 'KG',
        estimatedUnitRate: 260,
        isPurchased: false,
        notes: 'سالن اور پلاؤ کے لیے',
      },
      {
        nameUrdu: 'دال مونگ دھلی ہوئی',
        nameEnglish: 'Daal Moong Washed',
        category: 'PULSE',
        targetQty: Math.max(1, Math.round(scale * 1)),
        unit: 'KG',
        estimatedUnitRate: 310,
        isPurchased: false,
      },
      {
        nameUrdu: 'دال مسور ثابت / دھلی',
        nameEnglish: 'Daal Masoor Special',
        category: 'PULSE',
        targetQty: Math.max(1, Math.round(scale * 1)),
        unit: 'KG',
        estimatedUnitRate: 290,
        isPurchased: false,
      },
      {
        nameUrdu: 'دال ماش دھلی سپر',
        nameEnglish: 'Daal Mash Premium',
        category: 'PULSE',
        targetQty: Math.max(1, Math.round(scale * 1)),
        unit: 'KG',
        estimatedUnitRate: 480,
        isPurchased: false,
      },
      {
        nameUrdu: 'سفید چنے کابلی',
        nameEnglish: 'White Chickpeas (Chana)',
        category: 'PULSE',
        targetQty: Math.max(1, roundQty(2)),
        unit: 'KG',
        estimatedUnitRate: 380,
        isPurchased: false,
        notes: 'چھولے سالن و چاٹ',
      },
      {
        nameUrdu: 'واشنگ پاؤڈر (سرف)',
        nameEnglish: 'Washing Powder (Surf)',
        category: 'CLEANING',
        targetQty: Math.max(1, roundQty(2)),
        unit: 'PACK',
        estimatedUnitRate: 550,
        isPurchased: false,
        notes: '1 کلو پیکٹ',
      },
      {
        nameUrdu: 'برتن دھونے کا صابن / لیکوئڈ',
        nameEnglish: 'Dishwashing Soap / Bar',
        category: 'CLEANING',
        targetQty: 3,
        unit: 'PACK',
        estimatedUnitRate: 80,
        isPurchased: false,
      },
      {
        nameUrdu: 'نہانے کا صابن (ڈیٹول/لکس)',
        nameEnglish: 'Bath Soap Bars',
        category: 'CLEANING',
        targetQty: 4,
        unit: 'PACK',
        estimatedUnitRate: 130,
        isPurchased: false,
      },
      {
        nameUrdu: 'ٹوتھ پیسٹ فیملی پیک',
        nameEnglish: 'Toothpaste (Family Pack)',
        category: 'CLEANING',
        targetQty: 1,
        unit: 'PACK',
        estimatedUnitRate: 280,
        isPurchased: false,
      },
    ];
  }

  /**
   * Enrich plan items and calculate analytics totals
   */
  static enrichPlan(plan: IRashanMonthlyPlan): IRashanPlanResponse {
    let totalEstimatedBudget = 0;
    let totalActualSpent = 0;
    let purchasedCount = 0;
    let deficitCount = 0;

    const enrichedItems: IEnrichedRashanItem[] = plan.items.map((it: any) => {
      const estimatedTotal = (it.targetQty || 0) * (it.estimatedUnitRate || 0);
      totalEstimatedBudget += estimatedTotal;

      const actualQty = it.actualQtyPurchased !== undefined ? it.actualQtyPurchased : it.targetQty;
      const actualRate = it.actualUnitRate !== undefined ? it.actualUnitRate : it.estimatedUnitRate;
      const actualTotal = it.isPurchased ? actualQty * actualRate : 0;

      if (it.isPurchased) {
        totalActualSpent += actualTotal;
        purchasedCount++;
      }

      const variance = it.isPurchased ? actualTotal - estimatedTotal : 0;
      const rateDeficit = it.isPurchased && actualRate > it.estimatedUnitRate;
      const totalDeficit = it.isPurchased && actualTotal > estimatedTotal;
      const isDeficit = rateDeficit || totalDeficit;

      if (isDeficit) deficitCount++;

      // Meaningful price inflation percentage per unit
      const variancePercentage =
        it.estimatedUnitRate > 0 && it.isPurchased
          ? Math.round(((actualRate - it.estimatedUnitRate) / it.estimatedUnitRate) * 100)
          : 0;

      return {
        id: it._id ? it._id.toString() : it.id || '',
        nameUrdu: it.nameUrdu,
        nameEnglish: it.nameEnglish,
        category: it.category,
        targetQty: it.targetQty,
        unit: it.unit,
        estimatedUnitRate: it.estimatedUnitRate,
        actualUnitRate: it.actualUnitRate,
        actualQtyPurchased: it.actualQtyPurchased,
        isPurchased: !!it.isPurchased,
        notes: it.notes,
        estimatedTotal,
        actualTotal,
        variance,
        isDeficit,
        variancePercentage,
      };
    });

    const customTarget =
      plan.customTargetBudget && plan.customTargetBudget > 0 ? plan.customTargetBudget : undefined;
    const effectiveBudget = customTarget !== undefined ? customTarget : totalEstimatedBudget;
    const netVariance = totalActualSpent - effectiveBudget;
    const envelopePercentageUsed =
      effectiveBudget > 0 ? Math.min(100, Math.round((totalActualSpent / effectiveBudget) * 100)) : 0;
    const remainingBudget = Math.max(0, effectiveBudget - totalActualSpent);

    const whatsAppText = this.buildWhatsAppText(plan, enrichedItems, effectiveBudget, totalActualSpent);

    return {
      planId: (plan._id as any).toString(),
      month: plan.month,
      year: plan.year,
      monthKey: plan.monthKey,
      householdSize: plan.householdSize,
      status: plan.status,
      reconciledAt: plan.reconciledAt,
      paymentMethod: plan.paymentMethod,
      totalEstimatedBudget,
      customTargetBudget: customTarget,
      effectiveBudget,
      totalActualSpent,
      netVariance,
      envelopePercentageUsed,
      remainingBudget,
      totalItemsCount: enrichedItems.length,
      purchasedItemsCount: purchasedCount,
      deficitItemsCount: deficitCount,
      items: enrichedItems,
      whatsAppText,
    };
  }

  /**
   * Build WhatsApp formatted message for sharing grocery shopping list
   */
  static buildWhatsAppText(
    plan: IRashanMonthlyPlan,
    items: IEnrichedRashanItem[],
    budgetToDisplay: number,
    totalAct: number
  ): string {
    const monthNamesUrdu = [
      'جنوری', 'فروری', 'مارچ', 'اپریل', 'مئی', 'جون',
      'جولائی', 'اگست', 'ستمبر', 'اکتوبر', 'نومبر', 'دسمبر'
    ];
    const monthName = monthNamesUrdu[plan.month - 1] || `مہینہ ${plan.month}`;

    let msg = `🛒 *ماہانہ راشن لسٹ - ${monthName} ${plan.year}*\n`;
    msg += `افرادِ خانہ: ${plan.householdSize} | ڈجی حساب راشن رجسٹر\n`;
    msg += `------------------------------------\n`;

    const categories: { key: RashanCategory; label: string }[] = [
      { key: 'GRAIN', label: '🌾 اناج و آٹا (Grains)' },
      { key: 'OIL_GHEE', label: '🛢️ تیل و گھی (Oils)' },
      { key: 'SWEETENER', label: '☕ چینی، چائے و ناشتہ (Sweeteners)' },
      { key: 'SPICE', label: '🧂 مصالحہ جات (Spices)' },
      { key: 'PULSE', label: '🥣 دالیں و چنے (Pulses)' },
      { key: 'CLEANING', label: '🧼 صفائی و ہائجین (Cleaning & Toiletries)' },
    ];

    for (const cat of categories) {
      const catItems = items.filter((i) => i.category === cat.key);
      if (catItems.length > 0) {
        msg += `\n*${cat.label}*:\n`;
        for (const it of catItems) {
          const check = it.isPurchased ? '✅' : '⬜';
          msg += `${check} ${it.nameUrdu} (${it.nameEnglish}): ${it.targetQty} ${it.unit} (~Rs. ${it.estimatedTotal.toLocaleString()})\n`;
        }
      }
    }

    msg += `\n------------------------------------\n`;
    msg += `💰 *مختص راشن بجٹ:* Rs. ${budgetToDisplay.toLocaleString()}\n`;
    if (totalAct > 0) {
      msg += `💵 *اصل خریداری خرچہ:* Rs. ${totalAct.toLocaleString()}\n`;
    }
    msg += `📱 _Generated via DigiHisab Ghar Ka Hisab_`;

    return msg;
  }

  /**
   * Get or create monthly plan for the profile
   */
  static async getOrCreatePlan(
    profileId: string,
    month?: number,
    year?: number,
    householdSize: number = 5
  ): Promise<IRashanPlanResponse> {
    const now = new Date();
    const currentMonth = month || now.getMonth() + 1;
    const currentYear = year || now.getFullYear();
    const monthKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`;

    let plan = await RashanMonthlyPlan.findOne({
      profileId: new Types.ObjectId(profileId),
      monthKey,
    });

    if (!plan) {
      const defaultStaples = this.getDefaultStaples(householdSize);
      const initialTotal = defaultStaples.reduce(
        (acc, item) => acc + item.targetQty * item.estimatedUnitRate,
        0
      );

      plan = await RashanMonthlyPlan.create({
        profileId: new Types.ObjectId(profileId),
        householdHeadId: profileId,
        month: currentMonth,
        year: currentYear,
        monthKey,
        householdSize,
        totalEstimatedBudget: initialTotal,
        totalActualSpent: 0,
        status: 'PLANNING',
        items: defaultStaples,
      });
    }

    return this.enrichPlan(plan);
  }

  /**
   * Set or update custom monthly target budget cap
   */
  static async updateTargetBudget(
    profileId: string,
    planId: string,
    customTargetBudget: number | null
  ): Promise<IRashanPlanResponse> {
    const plan = await RashanMonthlyPlan.findOne({
      _id: new Types.ObjectId(planId),
      profileId: new Types.ObjectId(profileId),
    });

    if (!plan) {
      throw new Error('راشن پلان نہیں ملا (Rashan Plan not found)');
    }

    plan.customTargetBudget =
      customTargetBudget && customTargetBudget > 0 ? Number(customTargetBudget) : undefined;
    await plan.save();
    return this.enrichPlan(plan);
  }

  /**
   * Update item inside a plan
   */
  static async updateItem(
    profileId: string,
    planId: string,
    itemId: string,
    updates: Partial<IRashanItem>
  ): Promise<IRashanPlanResponse> {
    const plan = await RashanMonthlyPlan.findOne({
      _id: new Types.ObjectId(planId),
      profileId: new Types.ObjectId(profileId),
    });

    if (!plan) {
      throw new Error('راشن پلان نہیں ملا (Rashan Plan not found)');
    }

    const item = (plan.items as any).id(itemId);
    if (!item) {
      throw new Error('راشن آئٹم نہیں ملا (Rashan Item not found)');
    }

    if (updates.nameUrdu !== undefined) item.nameUrdu = updates.nameUrdu;
    if (updates.nameEnglish !== undefined) item.nameEnglish = updates.nameEnglish;
    if (updates.category !== undefined) item.category = updates.category;
    if (updates.targetQty !== undefined) {
      item.targetQty = Math.max(0, updates.targetQty);
      // If item was not yet checked off in checkout, keep actualQty aligned with target
      if (!item.isPurchased) {
        item.actualQtyPurchased = item.targetQty;
      }
    }
    if (updates.unit !== undefined) item.unit = updates.unit;
    if (updates.estimatedUnitRate !== undefined) {
      item.estimatedUnitRate = Math.max(0, updates.estimatedUnitRate);
      if (!item.isPurchased && (item.actualUnitRate === undefined || item.actualUnitRate === 0)) {
        item.actualUnitRate = item.estimatedUnitRate;
      }
    }
    if (updates.actualUnitRate !== undefined) item.actualUnitRate = Math.max(0, updates.actualUnitRate);
    if (updates.actualQtyPurchased !== undefined) item.actualQtyPurchased = Math.max(0, updates.actualQtyPurchased);
    if (updates.isPurchased !== undefined) item.isPurchased = updates.isPurchased;
    if (updates.notes !== undefined) item.notes = updates.notes;

    // Recalculate totals
    let totalEst = 0;
    let totalAct = 0;
    let hasAnyPurchased = false;

    plan.items.forEach((it) => {
      totalEst += (it.targetQty || 0) * (it.estimatedUnitRate || 0);
      if (it.isPurchased) {
        hasAnyPurchased = true;
        const q = it.actualQtyPurchased !== undefined ? it.actualQtyPurchased : it.targetQty;
        const r = it.actualUnitRate !== undefined ? it.actualUnitRate : it.estimatedUnitRate;
        totalAct += q * r;
      }
    });

    plan.totalEstimatedBudget = totalEst;
    plan.totalActualSpent = totalAct;
    if (plan.status !== 'RECONCILED') {
      plan.status = hasAnyPurchased ? 'IN_PROGRESS' : 'PLANNING';
    }

    await plan.save();
    return this.enrichPlan(plan);
  }

  /**
   * Toggle purchase state of an item (Fast In-Store Mode)
   */
  static async toggleItemPurchase(
    profileId: string,
    planId: string,
    itemId: string,
    isPurchased: boolean,
    actualQtyPurchased?: number,
    actualUnitRate?: number
  ): Promise<IRashanPlanResponse> {
    const plan = await RashanMonthlyPlan.findOne({
      _id: new Types.ObjectId(planId),
      profileId: new Types.ObjectId(profileId),
    });

    if (!plan) {
      throw new Error('راشن پلان نہیں ملا (Rashan Plan not found)');
    }

    const item = (plan.items as any).id(itemId);
    if (!item) {
      throw new Error('راشن آئٹم نہیں ملا (Rashan Item not found)');
    }

    item.isPurchased = isPurchased;
    if (isPurchased) {
      item.actualQtyPurchased =
        actualQtyPurchased !== undefined ? actualQtyPurchased : (item.actualQtyPurchased ?? item.targetQty);
      item.actualUnitRate =
        actualUnitRate !== undefined ? actualUnitRate : (item.actualUnitRate ?? item.estimatedUnitRate);
    }

    let totalEst = 0;
    let totalAct = 0;
    let hasPurchased = false;

    plan.items.forEach((it) => {
      totalEst += (it.targetQty || 0) * (it.estimatedUnitRate || 0);
      if (it.isPurchased) {
        hasPurchased = true;
        const q = it.actualQtyPurchased !== undefined ? it.actualQtyPurchased : it.targetQty;
        const r = it.actualUnitRate !== undefined ? it.actualUnitRate : it.estimatedUnitRate;
        totalAct += q * r;
      }
    });

    plan.totalEstimatedBudget = totalEst;
    plan.totalActualSpent = totalAct;
    if (plan.status !== 'RECONCILED') {
      plan.status = hasPurchased ? 'IN_PROGRESS' : 'PLANNING';
    }

    await plan.save();
    return this.enrichPlan(plan);
  }

  /**
   * Add a new item to the plan
   */
  static async addItem(
    profileId: string,
    planId: string,
    itemData: {
      nameUrdu: string;
      nameEnglish: string;
      category: RashanCategory;
      targetQty: number;
      unit: RashanUnit;
      estimatedUnitRate: number;
      notes?: string;
    }
  ): Promise<IRashanPlanResponse> {
    const plan = await RashanMonthlyPlan.findOne({
      _id: new Types.ObjectId(planId),
      profileId: new Types.ObjectId(profileId),
    });

    if (!plan) {
      throw new Error('راشن پلان نہیں ملا (Rashan Plan not found)');
    }

    plan.items.push({
      nameUrdu: itemData.nameUrdu,
      nameEnglish: itemData.nameEnglish,
      category: itemData.category,
      targetQty: itemData.targetQty,
      unit: itemData.unit,
      estimatedUnitRate: itemData.estimatedUnitRate,
      isPurchased: false,
      notes: itemData.notes,
    });

    // Recalculate estimated
    plan.totalEstimatedBudget = plan.items.reduce(
      (acc, it) => acc + (it.targetQty || 0) * (it.estimatedUnitRate || 0),
      0
    );

    await plan.save();
    return this.enrichPlan(plan);
  }

  /**
   * Remove an item from the plan
   */
  static async removeItem(
    profileId: string,
    planId: string,
    itemId: string
  ): Promise<IRashanPlanResponse> {
    const plan = await RashanMonthlyPlan.findOne({
      _id: new Types.ObjectId(planId),
      profileId: new Types.ObjectId(profileId),
    });

    if (!plan) {
      throw new Error('راشن پلان نہیں ملا (Rashan Plan not found)');
    }

    (plan.items as any).pull({ _id: itemId });

    let totalEst = 0;
    let totalAct = 0;
    plan.items.forEach((it) => {
      totalEst += (it.targetQty || 0) * (it.estimatedUnitRate || 0);
      if (it.isPurchased) {
        const q = it.actualQtyPurchased !== undefined ? it.actualQtyPurchased : it.targetQty;
        const r = it.actualUnitRate !== undefined ? it.actualUnitRate : it.estimatedUnitRate;
        totalAct += q * r;
      }
    });

    plan.totalEstimatedBudget = totalEst;
    plan.totalActualSpent = totalAct;
    await plan.save();

    return this.enrichPlan(plan);
  }

  /**
   * Reset the plan back to default staples with given household size
   */
  static async resetToDefaults(
    profileId: string,
    planId: string,
    householdSize: number = 5
  ): Promise<IRashanPlanResponse> {
    const plan = await RashanMonthlyPlan.findOne({
      _id: new Types.ObjectId(planId),
      profileId: new Types.ObjectId(profileId),
    });

    if (!plan) {
      throw new Error('راشن پلان نہیں ملا (Rashan Plan not found)');
    }

    const defaultStaples = this.getDefaultStaples(householdSize);
    plan.householdSize = householdSize;
    plan.items = defaultStaples as any;
    plan.totalEstimatedBudget = defaultStaples.reduce(
      (acc, it) => acc + it.targetQty * it.estimatedUnitRate,
      0
    );
    plan.totalActualSpent = 0;
    plan.status = 'PLANNING';

    await plan.save();
    return this.enrichPlan(plan);
  }

  /**
   * Reconcile / Finalize Rashan Plan & optionally record CASH_OUT to Ledger
   */
  static async reconcilePlan(
    profileId: string,
    planId: string,
    params: {
      paymentMethod?: 'CASH' | 'JAZZCASH' | 'EASYPAISA' | 'BANK';
      recordToLedger?: boolean;
      notes?: string;
    }
  ): Promise<{ plan: IRashanPlanResponse; ledgerEntryId?: string }> {
    const plan = await RashanMonthlyPlan.findOne({
      _id: new Types.ObjectId(planId),
      profileId: new Types.ObjectId(profileId),
    });

    if (!plan) {
      throw new Error('راشن پلان نہیں ملا (Rashan Plan not found)');
    }

    plan.status = 'RECONCILED';
    plan.reconciledAt = new Date();
    plan.paymentMethod = params.paymentMethod || 'CASH';

    let ledgerEntryId: string | undefined;

    if (params.recordToLedger && plan.totalActualSpent > 0) {
      const entry = await LedgerEntry.create({
        profileId: new Types.ObjectId(profileId),
        entryType: 'CASH_OUT',
        amount: plan.totalActualSpent,
        category: 'Grocery & Rashan / ماہانہ راشن خرچ',
        paymentMethod: plan.paymentMethod,
        description: `ماہانہ راشن خریداری برائے ${plan.monthKey} بذریعہ ${plan.paymentMethod} ${
          params.notes ? `(${params.notes})` : ''
        }`,
        notes: `Reconciled via Digi Hisab Monthly Rashan Planner (${plan.monthKey})`,
        performedBy: 'HOUSEHOLD_USER',
      });
      ledgerEntryId = (entry._id as any).toString();
    }

    await plan.save();

    return {
      plan: this.enrichPlan(plan),
      ledgerEntryId,
    };
  }
}
