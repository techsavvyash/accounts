/**
 * HSN (Harmonized System of Nomenclature) Registry
 *
 * Comprehensive database of HSN codes, descriptions, and GST rates
 * as per Indian GST classification.
 *
 * HSN Structure:
 * - 2 digits: Chapter
 * - 4 digits: Heading
 * - 6 digits: Sub-heading
 * - 8 digits: Tariff item
 */

import { GSTRate, GST_RATES } from './types'

/**
 * HSN Chapter (2-digit codes)
 */
export interface HSNChapter {
  code: string
  description: string
  section: string
}

/**
 * HSN Code Entry (4, 6, or 8 digits)
 */
export interface HSNCode {
  code: string
  description: string
  chapter: string
  gstRate?: number
  cess?: number
  unit?: string
  notes?: string
}

/**
 * All 99 HSN Chapters
 */
export const HSN_CHAPTERS: Record<string, HSNChapter> = {
  // SECTION I: LIVE ANIMALS; ANIMAL PRODUCTS
  '01': { code: '01', description: 'Live Animals', section: 'I' },
  '02': { code: '02', description: 'Meat and Edible Meat Offal', section: 'I' },
  '03': { code: '03', description: 'Fish and Crustaceans, Molluscs and Other Aquatic Invertebrates', section: 'I' },
  '04': { code: '04', description: 'Dairy Produce; Birds\' Eggs; Natural Honey; Edible Products of Animal Origin', section: 'I' },
  '05': { code: '05', description: 'Products of Animal Origin, Not Elsewhere Specified or Included', section: 'I' },

  // SECTION II: VEGETABLE PRODUCTS
  '06': { code: '06', description: 'Live Trees and Other Plants; Bulbs, Roots; Cut Flowers', section: 'II' },
  '07': { code: '07', description: 'Edible Vegetables and Certain Roots and Tubers', section: 'II' },
  '08': { code: '08', description: 'Edible Fruit and Nuts; Peel of Citrus Fruit or Melons', section: 'II' },
  '09': { code: '09', description: 'Coffee, Tea, Maté and Spices', section: 'II' },
  '10': { code: '10', description: 'Cereals', section: 'II' },
  '11': { code: '11', description: 'Products of the Milling Industry; Malt; Starches; Inulin; Wheat Gluten', section: 'II' },
  '12': { code: '12', description: 'Oil Seeds and Oleaginous Fruits; Miscellaneous Grains, Seeds and Fruit', section: 'II' },
  '13': { code: '13', description: 'Lac; Gums, Resins and Other Vegetable Saps and Extracts', section: 'II' },
  '14': { code: '14', description: 'Vegetable Plaiting Materials; Vegetable Products Not Elsewhere Specified', section: 'II' },

  // SECTION III: ANIMAL OR VEGETABLE FATS AND OILS
  '15': { code: '15', description: 'Animal or Vegetable Fats and Oils and their Cleavage Products', section: 'III' },

  // SECTION IV: PREPARED FOODSTUFFS
  '16': { code: '16', description: 'Preparations of Meat, Fish or Crustaceans, Molluscs', section: 'IV' },
  '17': { code: '17', description: 'Sugars and Sugar Confectionery', section: 'IV' },
  '18': { code: '18', description: 'Cocoa and Cocoa Preparations', section: 'IV' },
  '19': { code: '19', description: 'Preparations of Cereals, Flour, Starch or Milk; Pastrycooks\' Products', section: 'IV' },
  '20': { code: '20', description: 'Preparations of Vegetables, Fruit, Nuts or Other Parts of Plants', section: 'IV' },
  '21': { code: '21', description: 'Miscellaneous Edible Preparations', section: 'IV' },
  '22': { code: '22', description: 'Beverages, Spirits and Vinegar', section: 'IV' },
  '23': { code: '23', description: 'Residues and Waste from the Food Industries; Prepared Animal Fodder', section: 'IV' },
  '24': { code: '24', description: 'Tobacco and Manufactured Tobacco Substitutes', section: 'IV' },

  // SECTION V: MINERAL PRODUCTS
  '25': { code: '25', description: 'Salt; Sulphur; Earths and Stone; Plastering Materials, Lime and Cement', section: 'V' },
  '26': { code: '26', description: 'Ores, Slag and Ash', section: 'V' },
  '27': { code: '27', description: 'Mineral Fuels, Mineral Oils and Products of their Distillation', section: 'V' },

  // SECTION VI: PRODUCTS OF THE CHEMICAL OR ALLIED INDUSTRIES
  '28': { code: '28', description: 'Inorganic Chemicals; Organic or Inorganic Compounds of Precious Metals', section: 'VI' },
  '29': { code: '29', description: 'Organic Chemicals', section: 'VI' },
  '30': { code: '30', description: 'Pharmaceutical Products', section: 'VI' },
  '31': { code: '31', description: 'Fertilisers', section: 'VI' },
  '32': { code: '32', description: 'Tanning or Dyeing Extracts; Tannins and their Derivatives; Dyes, Pigments', section: 'VI' },
  '33': { code: '33', description: 'Essential Oils and Resinoids; Perfumery, Cosmetic or Toilet Preparations', section: 'VI' },
  '34': { code: '34', description: 'Soap, Organic Surface-active Agents, Washing Preparations, Lubricants', section: 'VI' },
  '35': { code: '35', description: 'Albuminoidal Substances; Modified Starches; Glues; Enzymes', section: 'VI' },
  '36': { code: '36', description: 'Explosives; Pyrotechnic Products; Matches; Pyrophoric Alloys', section: 'VI' },
  '37': { code: '37', description: 'Photographic or Cinematographic Goods', section: 'VI' },
  '38': { code: '38', description: 'Miscellaneous Chemical Products', section: 'VI' },

  // SECTION VII: PLASTICS AND ARTICLES THEREOF; RUBBER AND ARTICLES THEREOF
  '39': { code: '39', description: 'Plastics and Articles Thereof', section: 'VII' },
  '40': { code: '40', description: 'Rubber and Articles Thereof', section: 'VII' },

  // SECTION VIII: RAW HIDES AND SKINS, LEATHER
  '41': { code: '41', description: 'Raw Hides and Skins (other than furskins) and Leather', section: 'VIII' },
  '42': { code: '42', description: 'Articles of Leather; Saddlery and Harness; Travel Goods, Handbags', section: 'VIII' },
  '43': { code: '43', description: 'Furskins and Artificial Fur; Manufactures Thereof', section: 'VIII' },

  // SECTION IX: WOOD AND ARTICLES OF WOOD
  '44': { code: '44', description: 'Wood and Articles of Wood; Wood Charcoal', section: 'IX' },
  '45': { code: '45', description: 'Cork and Articles of Cork', section: 'IX' },
  '46': { code: '46', description: 'Manufactures of Straw, of Esparto or of Other Plaiting Materials', section: 'IX' },

  // SECTION X: PULP OF WOOD OR OF OTHER FIBROUS CELLULOSIC MATERIAL
  '47': { code: '47', description: 'Pulp of Wood or of Other Fibrous Cellulosic Material; Recovered Paper', section: 'X' },
  '48': { code: '48', description: 'Paper and Paperboard; Articles of Paper Pulp, Paper or Paperboard', section: 'X' },
  '49': { code: '49', description: 'Printed Books, Newspapers, Pictures and Other Products of the Printing Industry', section: 'X' },

  // SECTION XI: TEXTILES AND TEXTILE ARTICLES
  '50': { code: '50', description: 'Silk', section: 'XI' },
  '51': { code: '51', description: 'Wool, Fine or Coarse Animal Hair; Horsehair Yarn and Woven Fabric', section: 'XI' },
  '52': { code: '52', description: 'Cotton', section: 'XI' },
  '53': { code: '53', description: 'Other Vegetable Textile Fibres; Paper Yarn and Woven Fabrics', section: 'XI' },
  '54': { code: '54', description: 'Man-made Filaments; Strip and the Like of Man-made Textile Materials', section: 'XI' },
  '55': { code: '55', description: 'Man-made Staple Fibres', section: 'XI' },
  '56': { code: '56', description: 'Wadding, Felt and Nonwovens; Special Yarns; Twine, Cordage, Ropes', section: 'XI' },
  '57': { code: '57', description: 'Carpets and Other Textile Floor Coverings', section: 'XI' },
  '58': { code: '58', description: 'Special Woven Fabrics; Tufted Textile Fabrics; Lace; Tapestries', section: 'XI' },
  '59': { code: '59', description: 'Impregnated, Coated, Covered or Laminated Textile Fabrics', section: 'XI' },
  '60': { code: '60', description: 'Knitted or Crocheted Fabrics', section: 'XI' },
  '61': { code: '61', description: 'Articles of Apparel and Clothing Accessories, Knitted or Crocheted', section: 'XI' },
  '62': { code: '62', description: 'Articles of Apparel and Clothing Accessories, Not Knitted or Crocheted', section: 'XI' },
  '63': { code: '63', description: 'Other Made-up Textile Articles; Sets; Worn Clothing', section: 'XI' },

  // SECTION XII: FOOTWEAR, HEADGEAR
  '64': { code: '64', description: 'Footwear, Gaiters and the Like; Parts of Such Articles', section: 'XII' },
  '65': { code: '65', description: 'Headgear and Parts Thereof', section: 'XII' },
  '66': { code: '66', description: 'Umbrellas, Sun Umbrellas, Walking-sticks, Seat-sticks, Whips', section: 'XII' },

  // SECTION XIII: ARTICLES OF STONE, PLASTER, CEMENT
  '68': { code: '68', description: 'Articles of Stone, Plaster, Cement, Asbestos, Mica or Similar Materials', section: 'XIII' },
  '69': { code: '69', description: 'Ceramic Products', section: 'XIII' },
  '70': { code: '70', description: 'Glass and Glassware', section: 'XIII' },

  // SECTION XIV: NATURAL OR CULTURED PEARLS, PRECIOUS STONES
  '71': { code: '71', description: 'Natural or Cultured Pearls, Precious or Semi-precious Stones, Precious Metals', section: 'XIV' },

  // SECTION XV: BASE METALS AND ARTICLES OF BASE METAL
  '72': { code: '72', description: 'Iron and Steel', section: 'XV' },
  '73': { code: '73', description: 'Articles of Iron or Steel', section: 'XV' },
  '74': { code: '74', description: 'Copper and Articles Thereof', section: 'XV' },
  '75': { code: '75', description: 'Nickel and Articles Thereof', section: 'XV' },
  '76': { code: '76', description: 'Aluminium and Articles Thereof', section: 'XV' },
  '78': { code: '78', description: 'Lead and Articles Thereof', section: 'XV' },
  '79': { code: '79', description: 'Zinc and Articles Thereof', section: 'XV' },
  '80': { code: '80', description: 'Tin and Articles Thereof', section: 'XV' },
  '81': { code: '81', description: 'Other Base Metals; Cermets; Articles Thereof', section: 'XV' },
  '82': { code: '82', description: 'Tools, Implements, Cutlery, Spoons and Forks, of Base Metal', section: 'XV' },
  '83': { code: '83', description: 'Miscellaneous Articles of Base Metal', section: 'XV' },

  // SECTION XVI: MACHINERY AND MECHANICAL APPLIANCES; ELECTRICAL EQUIPMENT
  '84': { code: '84', description: 'Nuclear Reactors, Boilers, Machinery and Mechanical Appliances; Parts Thereof', section: 'XVI' },
  '85': { code: '85', description: 'Electrical Machinery and Equipment and Parts Thereof', section: 'XVI' },

  // SECTION XVII: VEHICLES, AIRCRAFT, VESSELS
  '86': { code: '86', description: 'Railway or Tramway Locomotives, Rolling-stock and Parts Thereof', section: 'XVII' },
  '87': { code: '87', description: 'Vehicles Other than Railway or Tramway Rolling-stock, and Parts', section: 'XVII' },
  '88': { code: '88', description: 'Aircraft, Spacecraft, and Parts Thereof', section: 'XVII' },
  '89': { code: '89', description: 'Ships, Boats and Floating Structures', section: 'XVII' },

  // SECTION XVIII: OPTICAL, PHOTOGRAPHIC, CINEMATOGRAPHIC, MEASURING
  '90': { code: '90', description: 'Optical, Photographic, Cinematographic, Measuring, Checking, Precision Instruments', section: 'XVIII' },
  '91': { code: '91', description: 'Clocks and Watches and Parts Thereof', section: 'XVIII' },
  '92': { code: '92', description: 'Musical Instruments; Parts and Accessories of Such Articles', section: 'XVIII' },

  // SECTION XIX: ARMS AND AMMUNITION
  '93': { code: '93', description: 'Arms and Ammunition; Parts and Accessories Thereof', section: 'XIX' },

  // SECTION XX: MISCELLANEOUS MANUFACTURED ARTICLES
  '94': { code: '94', description: 'Furniture; Bedding, Mattresses, Mattress Supports, Cushions', section: 'XX' },
  '95': { code: '95', description: 'Toys, Games and Sports Requisites; Parts and Accessories Thereof', section: 'XX' },
  '96': { code: '96', description: 'Miscellaneous Manufactured Articles', section: 'XX' },

  // SECTION XXI: WORKS OF ART, COLLECTORS' PIECES AND ANTIQUES
  '97': { code: '97', description: 'Works of Art, Collectors\' Pieces and Antiques', section: 'XXI' },
  '98': { code: '98', description: 'Project Imports; Passengers\' Baggage', section: 'XXI' },
  '99': { code: '99', description: 'Miscellaneous Goods', section: 'XXI' }
}

/**
 * Common HSN Codes with GST Rates (4, 6, and 8 digit codes)
 * This is a representative sample - can be extended
 */
export const COMMON_HSN_CODES: HSNCode[] = [
  // Food Items
  { code: '0701', description: 'Potatoes, fresh or chilled', chapter: '07', gstRate: 0, unit: 'KGM' },
  { code: '0702', description: 'Tomatoes, fresh or chilled', chapter: '07', gstRate: 0, unit: 'KGM' },
  { code: '0703', description: 'Onions, shallots, garlic, leeks', chapter: '07', gstRate: 0, unit: 'KGM' },
  { code: '0801', description: 'Coconuts, Brazil nuts and cashew nuts, fresh or dried', chapter: '08', gstRate: 5, unit: 'KGM' },
  { code: '0901', description: 'Coffee, whether or not roasted or decaffeinated', chapter: '09', gstRate: 5, unit: 'KGM' },
  { code: '0902', description: 'Tea, whether or not flavoured', chapter: '09', gstRate: 5, unit: 'KGM' },
  { code: '1001', description: 'Wheat and meslin', chapter: '10', gstRate: 0, unit: 'KGM' },
  { code: '1006', description: 'Rice', chapter: '10', gstRate: 0, unit: 'KGM' },

  // Dairy Products
  { code: '0401', description: 'Milk and cream, not concentrated nor sweetened', chapter: '04', gstRate: 0, unit: 'LTR' },
  { code: '0402', description: 'Milk and cream, concentrated or sweetened', chapter: '04', gstRate: 5, unit: 'KGM' },
  { code: '0403', description: 'Buttermilk, curdled milk, yogurt, kephir', chapter: '04', gstRate: 5, unit: 'KGM' },
  { code: '0404', description: 'Whey and other dairy products', chapter: '04', gstRate: 5, unit: 'KGM' },
  { code: '0405', description: 'Butter and other fats and oils derived from milk', chapter: '04', gstRate: 12, unit: 'KGM' },
  { code: '0406', description: 'Cheese and curd', chapter: '04', gstRate: 12, unit: 'KGM' },

  // Textiles
  { code: '52', description: 'Cotton and cotton products', chapter: '52', gstRate: 5, unit: 'MTR' },
  { code: '5208', description: 'Woven fabrics of cotton', chapter: '52', gstRate: 5, unit: 'MTR' },
  { code: '61', description: 'Knitted or crocheted apparel', chapter: '61', gstRate: 12, unit: 'PCS' },
  { code: '62', description: 'Non-knitted apparel', chapter: '62', gstRate: 12, unit: 'PCS' },

  // Footwear
  { code: '6401', description: 'Waterproof footwear with outer soles and uppers of rubber or plastics', chapter: '64', gstRate: 18, unit: 'PAR' },
  { code: '6402', description: 'Other footwear with outer soles and uppers of rubber or plastics', chapter: '64', gstRate: 18, unit: 'PAR' },
  { code: '6403', description: 'Footwear with outer soles of rubber, plastics, leather or composition leather', chapter: '64', gstRate: 18, unit: 'PAR' },
  { code: '6404', description: 'Footwear with outer soles of rubber or plastics and uppers of textile materials', chapter: '64', gstRate: 12, unit: 'PAR' },
  { code: '6405', description: 'Other footwear', chapter: '64', gstRate: 18, unit: 'PAR' },

  // Electronics & IT Products
  { code: '8471', description: 'Automatic data processing machines and units thereof', chapter: '84', gstRate: 18, unit: 'NOS' },
  { code: '847130', description: 'Portable automatic data processing machines, weighing not more than 10 kg (Laptops)', chapter: '84', gstRate: 18, unit: 'NOS' },
  { code: '847141', description: 'Automatic data processing machines comprising CPU, input & output unit (Desktop PCs)', chapter: '84', gstRate: 18, unit: 'NOS' },
  { code: '847150', description: 'Digital processing units other than those of sub-headings 8471.41 and 8471.49', chapter: '84', gstRate: 18, unit: 'NOS' },
  { code: '847160', description: 'Input or output units, whether or not containing storage units', chapter: '84', gstRate: 18, unit: 'NOS' },
  { code: '847170', description: 'Storage units', chapter: '84', gstRate: 18, unit: 'NOS' },
  { code: '8473', description: 'Parts and accessories for machines of heading 8471', chapter: '84', gstRate: 18, unit: 'NOS' },
  { code: '8517', description: 'Telephone sets, including telephones for cellular networks or for other wireless networks', chapter: '85', gstRate: 18, unit: 'NOS' },
  { code: '851712', description: 'Telephones for cellular networks or for other wireless networks (Mobile Phones)', chapter: '85', gstRate: 18, unit: 'NOS' },
  { code: '851762', description: 'Machines for reception, conversion and transmission or regeneration of voice, images', chapter: '85', gstRate: 18, unit: 'NOS' },
  { code: '8518', description: 'Microphones, loudspeakers, headphones and earphones', chapter: '85', gstRate: 18, unit: 'NOS' },
  { code: '8528', description: 'Monitors and projectors, not incorporating television reception apparatus', chapter: '85', gstRate: 18, unit: 'NOS' },

  // Printers and Office Equipment
  { code: '8443', description: 'Printing machinery used for printing by means of plates, cylinders and other printing components', chapter: '84', gstRate: 18, unit: 'NOS' },
  { code: '844331', description: 'Printers (laser, inkjet, etc.)', chapter: '84', gstRate: 18, unit: 'NOS' },
  { code: '8470', description: 'Calculating machines and pocket-size data recording', chapter: '84', gstRate: 18, unit: 'NOS' },
  { code: '8472', description: 'Other office machines (duplicating machines, addressing machines, etc.)', chapter: '84', gstRate: 18, unit: 'NOS' },

  // Plastics
  { code: '39', description: 'Plastics and articles thereof', chapter: '39', gstRate: 18, unit: 'KGM' },
  { code: '3920', description: 'Plastic sheets, film, foil and strip', chapter: '39', gstRate: 18, unit: 'KGM' },
  { code: '3923', description: 'Articles for the conveyance or packing of goods, of plastics', chapter: '39', gstRate: 18, unit: 'KGM' },
  { code: '3926', description: 'Other articles of plastics', chapter: '39', gstRate: 18, unit: 'KGM' },
  { code: '392690', description: 'Other articles of plastics (mobile covers, etc.)', chapter: '39', gstRate: 18, unit: 'NOS' },

  // Paper and Stationery
  { code: '4801', description: 'Newsprint, in rolls or sheets', chapter: '48', gstRate: 5, unit: 'KGM' },
  { code: '4802', description: 'Uncoated paper and paperboard', chapter: '48', gstRate: 12, unit: 'KGM' },
  { code: '4820', description: 'Exercise books, note books, diaries', chapter: '48', gstRate: 12, unit: 'NOS' },
  { code: '482010', description: 'Exercise books (notebooks)', chapter: '48', gstRate: 12, unit: 'NOS' },
  { code: '4901', description: 'Printed books, brochures, leaflets', chapter: '49', gstRate: 5, unit: 'NOS' },
  { code: '490110', description: 'Books (printed)', chapter: '49', gstRate: 5, unit: 'NOS' },

  // Furniture
  { code: '9403', description: 'Other furniture and parts thereof', chapter: '94', gstRate: 18, unit: 'NOS' },
  { code: '940330', description: 'Wooden furniture of a kind used in offices', chapter: '94', gstRate: 18, unit: 'NOS' },
  { code: '940340', description: 'Wooden furniture of a kind used in the kitchen', chapter: '94', gstRate: 18, unit: 'NOS' },
  { code: '940350', description: 'Wooden furniture of a kind used in the bedroom', chapter: '94', gstRate: 18, unit: 'NOS' },
  { code: '940360', description: 'Other wooden furniture', chapter: '94', gstRate: 18, unit: 'NOS' },

  // Automobiles
  { code: '8702', description: 'Motor vehicles for the transport of ten or more persons', chapter: '87', gstRate: 28, cess: 15, unit: 'NOS', notes: 'Buses with cess' },
  { code: '8703', description: 'Motor cars and other motor vehicles principally designed for the transport of persons', chapter: '87', gstRate: 28, cess: 22, unit: 'NOS', notes: 'Cars - cess varies by engine size' },
  { code: '870321', description: 'Vehicles with spark-ignition internal combustion reciprocating piston engine of a cylinder capacity not exceeding 1,000 cc', chapter: '87', gstRate: 28, cess: 1, unit: 'NOS' },
  { code: '870322', description: 'Vehicles with spark-ignition internal combustion reciprocating piston engine of a cylinder capacity exceeding 1,000 cc but not exceeding 1,500 cc', chapter: '87', gstRate: 28, cess: 15, unit: 'NOS' },
  { code: '870323', description: 'Vehicles with spark-ignition internal combustion reciprocating piston engine of a cylinder capacity exceeding 1,500 cc but not exceeding 3,000 cc', chapter: '87', gstRate: 28, cess: 17, unit: 'NOS' },
  { code: '870324', description: 'Vehicles with spark-ignition internal combustion reciprocating piston engine of a cylinder capacity exceeding 3,000 cc', chapter: '87', gstRate: 28, cess: 22, unit: 'NOS' },
  { code: '8704', description: 'Motor vehicles for the transport of goods', chapter: '87', gstRate: 28, unit: 'NOS' },
  { code: '8711', description: 'Motorcycles (including mopeds) and cycles fitted with an auxiliary motor', chapter: '87', gstRate: 28, unit: 'NOS' },
  { code: '8712', description: 'Bicycles and other cycles (including delivery tricycles), not motorised', chapter: '87', gstRate: 12, unit: 'NOS' },

  // Pharmaceuticals
  { code: '30', description: 'Pharmaceutical products', chapter: '30', gstRate: 12, unit: 'KGM' },
  { code: '3003', description: 'Medicaments consisting of two or more constituents mixed together', chapter: '30', gstRate: 12, unit: 'KGM' },
  { code: '3004', description: 'Medicaments consisting of mixed or unmixed products for therapeutic or prophylactic uses', chapter: '30', gstRate: 12, unit: 'KGM' },

  // Cosmetics and Toiletries
  { code: '3303', description: 'Perfumes and toilet waters', chapter: '33', gstRate: 28, unit: 'KGM' },
  { code: '3304', description: 'Beauty or make-up preparations and preparations for the care of the skin', chapter: '33', gstRate: 28, unit: 'KGM' },
  { code: '3305', description: 'Preparations for use on the hair', chapter: '33', gstRate: 28, unit: 'KGM' },
  { code: '3306', description: 'Preparations for oral or dental hygiene (toothpaste, etc.)', chapter: '33', gstRate: 18, unit: 'KGM' },
  { code: '3401', description: 'Soap; organic surface-active products and preparations for use as soap', chapter: '34', gstRate: 18, unit: 'KGM' },
  { code: '340111', description: 'Soap for toilet use (toilet soap)', chapter: '34', gstRate: 18, unit: 'KGM' },

  // Toys and Sports Goods
  { code: '9503', description: 'Tricycles, scooters, pedal cars and similar wheeled toys; dolls\' carriages; dolls; other toys', chapter: '95', gstRate: 12, unit: 'NOS' },
  { code: '9504', description: 'Video game consoles and machines, articles for funfair, table or parlour games', chapter: '95', gstRate: 28, unit: 'NOS' },
  { code: '9506', description: 'Articles and equipment for general physical exercise, gymnastics, athletics', chapter: '95', gstRate: 18, unit: 'NOS' },

  // Jewelry
  { code: '7113', description: 'Articles of jewellery and parts thereof, of precious metal or of metal clad with precious metal', chapter: '71', gstRate: 3, unit: 'GRM' },
  { code: '7114', description: 'Articles of goldsmiths\' or silversmiths\' wares', chapter: '71', gstRate: 3, unit: 'GRM' },

  // Construction Materials
  { code: '6907', description: 'Ceramic flags and paving, hearth or wall tiles', chapter: '69', gstRate: 28, unit: 'MTK' },
  { code: '6908', description: 'Glazed ceramic flags and paving, hearth or wall tiles', chapter: '69', gstRate: 28, unit: 'MTK' },
  { code: '7308', description: 'Structures and parts of structures, of iron or steel', chapter: '73', gstRate: 18, unit: 'KGM' },
  { code: '7326', description: 'Other articles of iron or steel', chapter: '73', gstRate: 18, unit: 'KGM' }
]

/**
 * HSN Registry Class for searching and querying HSN codes
 */
export class HSNRegistry {
  private static hsnMap: Map<string, HSNCode> = new Map()

  static {
    // Initialize HSN map
    COMMON_HSN_CODES.forEach(hsn => {
      this.hsnMap.set(hsn.code, hsn)
    })
  }

  /**
   * Get chapter information
   */
  static getChapter(chapterCode: string): HSNChapter | undefined {
    return HSN_CHAPTERS[chapterCode.padStart(2, '0')]
  }

  /**
   * Get all chapters
   */
  static getAllChapters(): HSNChapter[] {
    return Object.values(HSN_CHAPTERS)
  }

  /**
   * Get chapters by section
   */
  static getChaptersBySection(section: string): HSNChapter[] {
    return Object.values(HSN_CHAPTERS).filter(ch => ch.section === section)
  }

  /**
   * Find HSN code by exact match
   */
  static findByCode(code: string): HSNCode | undefined {
    return this.hsnMap.get(code)
  }

  /**
   * Search HSN codes by description (case-insensitive)
   */
  static searchByDescription(query: string): HSNCode[] {
    const lowerQuery = query.toLowerCase()
    return COMMON_HSN_CODES.filter(hsn =>
      hsn.description.toLowerCase().includes(lowerQuery)
    )
  }

  /**
   * Get all HSN codes for a chapter
   */
  static getByChapter(chapterCode: string): HSNCode[] {
    const chapter = chapterCode.padStart(2, '0')
    return COMMON_HSN_CODES.filter(hsn => hsn.chapter === chapter)
  }

  /**
   * Get HSN codes by GST rate
   */
  static getByGSTRate(rate: number): HSNCode[] {
    return COMMON_HSN_CODES.filter(hsn => hsn.gstRate === rate)
  }

  /**
   * Get recommended GST rate for HSN code
   */
  static getRecommendedGSTRate(code: string): number | undefined {
    // Try exact match first
    const exactMatch = this.hsnMap.get(code)
    if (exactMatch) {
      return exactMatch.gstRate
    }

    // Try prefix match (e.g., '847130' matches '8471')
    for (let len = code.length - 1; len >= 2; len--) {
      const prefix = code.substring(0, len)
      const match = this.hsnMap.get(prefix)
      if (match) {
        return match.gstRate
      }
    }

    return undefined
  }

  /**
   * Get HSN code with details (combines chapter and specific code info)
   */
  static getDetails(code: string): {
    code: string
    chapter?: HSNChapter
    details?: HSNCode
    recommendedGSTRate?: number
  } {
    const chapterCode = code.substring(0, 2)
    const chapter = this.getChapter(chapterCode)
    const details = this.findByCode(code)
    const recommendedGSTRate = this.getRecommendedGSTRate(code)

    return {
      code,
      chapter,
      details,
      recommendedGSTRate
    }
  }

  /**
   * Validate and get HSN info (returns formatted result)
   */
  static lookup(code: string): {
    isValid: boolean
    code: string
    description: string
    gstRate?: number
    cess?: number
    unit?: string
    chapterDescription?: string
  } {
    if (!code || code.length < 2) {
      return {
        isValid: false,
        code,
        description: 'Invalid HSN code'
      }
    }

    const details = this.getDetails(code)
    const chapter = details.chapter

    if (!chapter) {
      return {
        isValid: false,
        code,
        description: 'Unknown HSN chapter'
      }
    }

    const hsnCode = details.details
    if (hsnCode) {
      return {
        isValid: true,
        code: hsnCode.code,
        description: hsnCode.description,
        gstRate: hsnCode.gstRate,
        cess: hsnCode.cess,
        unit: hsnCode.unit,
        chapterDescription: chapter.description
      }
    }

    return {
      isValid: true,
      code,
      description: chapter.description,
      chapterDescription: chapter.description,
      gstRate: details.recommendedGSTRate
    }
  }

  /**
   * Get all registered HSN codes
   */
  static getAllCodes(): HSNCode[] {
    return COMMON_HSN_CODES
  }

  /**
   * Get count of registered HSN codes
   */
  static getCount(): {
    chapters: number
    codes: number
  } {
    return {
      chapters: Object.keys(HSN_CHAPTERS).length,
      codes: COMMON_HSN_CODES.length
    }
  }
}
