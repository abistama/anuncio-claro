// UI localization. The engine stays language-neutral (it emits status/field
// enums); everything a human reads is resolved here. Supported: Spanish (Spain),
// English, Catalan. Browser preference picks the locale; Spanish is the default.
//
// Keys are flat strings; composite keys like `field.max_rent` / `status.missing`
// map engine enums to labels. t() falls back to Spanish, then to the key itself.

export type Locale = 'es' | 'en' | 'ca' | 'eu' | 'gl';
export const SUPPORTED_LOCALES: readonly Locale[] = ['es', 'en', 'ca', 'eu', 'gl'];
export const DEFAULT_LOCALE: Locale = 'es';

type Catalog = Record<string, string>;

const es: Catalog = {
  'verdict.pass.head': 'El anuncio incluye los datos obligatorios',
  'verdict.warn.head': 'Hay dudas o faltan datos complementarios',
  'verdict.fail.head': 'Faltan datos obligatorios',
  'verdict.label.pass': 'CUMPLE',
  'verdict.label.warn': 'REVISAR',
  'verdict.label.fail': 'NO CUMPLE',

  'pill.pass': 'Cumple',
  'pill.warn': 'Revisar',
  'pill.missing.one': 'Falta 1 dato obligatorio',
  'pill.missing.many': 'Faltan {n} datos obligatorios',

  'basics.price': 'Precio',
  'basics.area': 'Superficie',
  'basics.municipality': 'Municipio',
  'basics.stressed': 'Zona tensionada',
  'zone.yes': 'Sí',
  'zone.no': 'No',
  'zone.unknown': 'Desconocida',
  'value.yes': 'Sí',
  'value.no': 'No',
  'unit.month': '€/mes',
  'unit.month_per_m2': '€/m²',
  'na': 'n/d',

  'checks.heading': 'Comprobaciones',
  'status.present': 'Presente',
  'status.missing': 'Ausente',
  'status.uncertain': 'Dudoso',
  'status.not_applicable': 'No aplica',

  'field.rent_reference_index': 'Índice de referencia',
  'field.max_rent': 'Renta máxima aplicable',
  'field.rent_limit_basis': 'Normativa del límite',
  'field.previous_rent': 'Renta del contrato anterior',
  'field.large_landlord': 'Gran tenedor',
  'field.unit_registration_code': 'Código de registro',
  'field.energy_certificate': 'Certificado energético',

  'evidence.from': 'En {src}:',
  'source.title': 'el título',
  'source.description': 'la descripción',
  'source.features': 'la ficha técnica',
  'source.structured_data': 'los datos de la página',
  'evidence.none': 'No se ha encontrado este dato en el anuncio.',
  'energy.label': 'Calificación energética {letter}',
  'method.model': 'Según modelo local · confianza {pct}%',
  'warn.priceAbove': 'El precio supera el límite indicado en el propio anuncio.',
  'scope.vacationalNotice': 'Este anuncio se presenta como vacacional o de temporada. Si lo es realmente, queda fuera del ámbito de la norma. Si es vivienda habitual encubierta, el anunciante podría estar eludiendo la obligación de informar. Análisis a título informativo.',

  'meta.url': 'URL',
  'meta.id': 'ID del anuncio',
  'meta.checkedAt': 'Fecha de análisis',
  'meta.ruleset': 'Versión de reglas',
  'meta.sha256': 'Huella SHA-256',
  'meta.qr': 'Escanea para abrir el anuncio',

  'actions.copyText': 'Copiar ficha',
  'actions.copyJson': 'Copiar JSON',
  'actions.exportPdf': 'Exportar PDF',
  'actions.reportError': 'Reportar un error',
  'advanced.title': 'Avanzado',
  'report.bodyIntro': 'Describe el error (por ejemplo, un dato que sí aparece en el anuncio, o un municipio mal clasificado como zona tensionada):',
  'settings.language': 'Idioma',
  'toast.pdfOpened': 'Se ha abierto el PDF. Usa «Guardar como PDF».',
  'toast.copied': '{what} copiada al portapapeles.',
  'toast.copyError': 'No se pudo copiar.',
  'copy.ficha': 'Ficha',
  'copy.fichaJson': 'Ficha JSON',

  'means.rent_reference_index': 'Sin el índice de referencia no puedes saber qué precio marca la administración para esta vivienda.',
  'means.max_rent': 'Sin la renta máxima no puedes comprobar si el precio pedido supera el límite legal en zona tensionada.',
  'means.previous_rent': 'La renta del contrato anterior (últimos 5 años) condiciona el precio que se te puede pedir.',
  'means.large_landlord': 'Saber si el arrendador es gran tenedor cambia las reglas de precio que se le aplican.',
  'means.energy_certificate': 'El certificado energético es obligatorio en todo anuncio. "En trámite" no sustituye a la letra.',

  'disclaimer': 'Anuncio Claro informa, no asesora jurídicamente. Indica qué datos no se han encontrado en el anuncio. La responsabilidad de incluirlos es del anunciante.',
  'empty.noListing': 'Abre un anuncio de alquiler en un portal soportado para ver el análisis.',
  'empty.outOfScope': 'Este anuncio parece ser de temporada vacacional o de venta, fuera del ámbito de la norma. No se analiza.',
};

const en: Catalog = {
  'verdict.pass.head': 'The listing includes the required information',
  'verdict.warn.head': 'There are doubts or missing secondary data',
  'verdict.fail.head': 'Required information is missing',
  'verdict.label.pass': 'COMPLIANT',
  'verdict.label.warn': 'REVIEW',
  'verdict.label.fail': 'NON-COMPLIANT',

  'pill.pass': 'Compliant',
  'pill.warn': 'Review',
  'pill.missing.one': '1 required field missing',
  'pill.missing.many': '{n} required fields missing',

  'basics.price': 'Price',
  'basics.area': 'Area',
  'basics.municipality': 'Municipality',
  'basics.stressed': 'Stressed-market area',
  'zone.yes': 'Yes',
  'zone.no': 'No',
  'zone.unknown': 'Unknown',
  'value.yes': 'Yes',
  'value.no': 'No',
  'unit.month': '€/month',
  'unit.month_per_m2': '€/m²',
  'na': 'n/a',

  'checks.heading': 'Checks',
  'status.present': 'Present',
  'status.missing': 'Missing',
  'status.uncertain': 'Uncertain',
  'status.not_applicable': 'Not applicable',

  'field.rent_reference_index': 'Reference price index',
  'field.max_rent': 'Applicable maximum rent',
  'field.rent_limit_basis': 'Basis of the limit',
  'field.previous_rent': 'Previous contract rent',
  'field.large_landlord': 'Large landlord',
  'field.unit_registration_code': 'Registration code',
  'field.energy_certificate': 'Energy certificate',

  'evidence.from': 'In {src}:',
  'source.title': 'the title',
  'source.description': 'the description',
  'source.features': 'the feature sheet',
  'source.structured_data': "the page's data",
  'evidence.none': 'This information was not found in the listing.',
  'energy.label': 'Energy rating {letter}',
  'method.model': 'From local model · confidence {pct}%',
  'warn.priceAbove': 'The price exceeds the limit stated in the listing itself.',
  'scope.vacationalNotice': 'This listing presents itself as a holiday/seasonal let. If it genuinely is, it falls outside the rule. If it is a primary residence in disguise, the advertiser may be evading the disclosure duty. Analysis is informational.',

  'meta.url': 'URL',
  'meta.id': 'Listing ID',
  'meta.checkedAt': 'Checked at',
  'meta.ruleset': 'Ruleset version',
  'meta.sha256': 'SHA-256 hash',
  'meta.qr': 'Scan to open the listing',

  'actions.copyText': 'Copy summary',
  'actions.copyJson': 'Copy JSON',
  'actions.exportPdf': 'Export PDF',
  'actions.reportError': 'Report an error',
  'advanced.title': 'Advanced',
  'report.bodyIntro': 'Describe the error (for example, a datum that is in the listing, or a municipality wrongly flagged as a stressed-market area):',
  'settings.language': 'Language',
  'toast.pdfOpened': 'The PDF opened. Use "Save as PDF".',
  'toast.copied': '{what} copied to clipboard.',
  'toast.copyError': 'Could not copy.',
  'copy.ficha': 'Summary',
  'copy.fichaJson': 'JSON summary',

  'means.rent_reference_index': 'Without the reference index you cannot know the price the administration sets for this home.',
  'means.max_rent': 'Without the maximum rent you cannot check whether the asking price exceeds the legal limit in a stressed-market area.',
  'means.previous_rent': 'The previous contract rent (last 5 years) constrains the price you can be asked to pay.',
  'means.large_landlord': 'Whether the landlord is a large landlord changes the pricing rules that apply.',
  'means.energy_certificate': 'The energy certificate is mandatory in every listing. "In progress" does not replace the rating.',

  'disclaimer': 'Anuncio Claro informs, it does not give legal advice. It shows which data were not found in the listing. Providing them is the advertiser’s responsibility.',
  'empty.noListing': 'Open a rental listing on a supported portal to see the analysis.',
  'empty.outOfScope': 'This listing looks like a seasonal/holiday or sale ad, outside the scope of the rule. It is not analyzed.',
};

const ca: Catalog = {
  'verdict.pass.head': "L'anunci inclou les dades obligatòries",
  'verdict.warn.head': 'Hi ha dubtes o falten dades complementàries',
  'verdict.fail.head': 'Falten dades obligatòries',
  'verdict.label.pass': 'COMPLEIX',
  'verdict.label.warn': 'REVISAR',
  'verdict.label.fail': 'NO COMPLEIX',

  'pill.pass': 'Compleix',
  'pill.warn': 'Revisar',
  'pill.missing.one': 'Falta 1 dada obligatòria',
  'pill.missing.many': 'Falten {n} dades obligatòries',

  'basics.price': 'Preu',
  'basics.area': 'Superfície',
  'basics.municipality': 'Municipi',
  'basics.stressed': 'Zona tensionada',
  'zone.yes': 'Sí',
  'zone.no': 'No',
  'zone.unknown': 'Desconeguda',
  'value.yes': 'Sí',
  'value.no': 'No',
  'unit.month': '€/mes',
  'unit.month_per_m2': '€/m²',
  'na': 'n/d',

  'checks.heading': 'Comprovacions',
  'status.present': 'Present',
  'status.missing': 'Absent',
  'status.uncertain': 'Dubtós',
  'status.not_applicable': 'No aplica',

  'field.rent_reference_index': 'Índex de referència',
  'field.max_rent': 'Renda màxima aplicable',
  'field.rent_limit_basis': 'Normativa del límit',
  'field.previous_rent': 'Renda del contracte anterior',
  'field.large_landlord': 'Gran tenidor',
  'field.unit_registration_code': 'Codi de registre',
  'field.energy_certificate': 'Certificat energètic',

  'evidence.from': 'A {src}:',
  'source.title': 'el títol',
  'source.description': 'la descripció',
  'source.features': 'la fitxa tècnica',
  'source.structured_data': 'les dades de la pàgina',
  'evidence.none': "No s'ha trobat aquesta dada a l'anunci.",
  'energy.label': 'Qualificació energètica {letter}',
  'method.model': 'Segons model local · confiança {pct}%',
  'warn.priceAbove': "El preu supera el límit indicat en el mateix anunci.",
  'scope.vacationalNotice': "Aquest anunci es presenta com a vacacional o de temporada. Si ho és realment, queda fora de l'àmbit de la norma. Si és habitatge habitual encobert, l'anunciant podria estar eludint l'obligació d'informar. Anàlisi a títol informatiu.",

  'meta.url': 'URL',
  'meta.id': "ID de l'anunci",
  'meta.checkedAt': "Data d'anàlisi",
  'meta.ruleset': 'Versió de regles',
  'meta.sha256': 'Empremta SHA-256',
  'meta.qr': "Escaneja per obrir l'anunci",

  'actions.copyText': 'Copiar fitxa',
  'actions.copyJson': 'Copiar JSON',
  'actions.exportPdf': 'Exportar PDF',
  'actions.reportError': "Informar d'un error",
  'advanced.title': 'Avançat',
  'report.bodyIntro': "Descriu l'error (per exemple, una dada que sí apareix a l'anunci, o un municipi mal classificat com a zona tensionada):",
  'settings.language': 'Idioma',
  'toast.pdfOpened': "S'ha obert el PDF. Fes servir «Desa com a PDF».",
  'toast.copied': '{what} copiada al porta-retalls.',
  'toast.copyError': "No s'ha pogut copiar.",
  'copy.ficha': 'Fitxa',
  'copy.fichaJson': 'Fitxa JSON',

  'means.rent_reference_index': "Sense l'índex de referència no pots saber quin preu marca l'administració per a aquest habitatge.",
  'means.max_rent': 'Sense la renda màxima no pots comprovar si el preu demanat supera el límit legal en zona tensionada.',
  'means.previous_rent': 'La renda del contracte anterior (últims 5 anys) condiciona el preu que et poden demanar.',
  'means.large_landlord': "Saber si l'arrendador és gran tenidor canvia les regles de preu que se li apliquen.",
  'means.energy_certificate': "El certificat energètic és obligatori en tot anunci. «En tràmit» no substitueix la lletra.",

  'disclaimer': "Anuncio Claro informa, no assessora jurídicament. Indica quines dades no s'han trobat a l'anunci. La responsabilitat d'incloure-les és de l'anunciant.",
  'empty.noListing': "Obre un anunci de lloguer en un portal compatible per veure l'anàlisi.",
  'empty.outOfScope': "Aquest anunci sembla de temporada vacacional o de venda, fora de l'àmbit de la norma. No s'analitza.",
};

// Euskera. Translations are best-effort and should get a native review.
const eu: Catalog = {
  'verdict.pass.head': 'Iragarkiak nahitaezko datuak ditu',
  'verdict.warn.head': 'Zalantzak daude edo datu osagarriak falta dira',
  'verdict.fail.head': 'Nahitaezko datuak falta dira',
  'verdict.label.pass': 'BETETZEN DU',
  'verdict.label.warn': 'BERRIKUSI',
  'verdict.label.fail': 'EZ DU BETETZEN',

  'pill.pass': 'Betetzen du',
  'pill.warn': 'Berrikusi',
  'pill.missing.one': 'Nahitaezko datu 1 falta da',
  'pill.missing.many': 'Nahitaezko {n} datu falta dira',

  'basics.price': 'Prezioa',
  'basics.area': 'Azalera',
  'basics.municipality': 'Udalerria',
  'basics.stressed': 'Eremu tentsionatua',
  'zone.yes': 'Bai',
  'zone.no': 'Ez',
  'zone.unknown': 'Ezezaguna',
  'value.yes': 'Bai',
  'value.no': 'Ez',
  'unit.month': '€/hilean',
  'unit.month_per_m2': '€/m²',
  'na': 'n/d',

  'checks.heading': 'Egiaztapenak',
  'status.present': 'Badago',
  'status.missing': 'Falta da',
  'status.uncertain': 'Zalantzazkoa',
  'status.not_applicable': 'Ez dagokio',

  'field.rent_reference_index': 'Erreferentziazko indizea',
  'field.max_rent': 'Gehieneko errenta aplikagarria',
  'field.rent_limit_basis': 'Mugaren araudia',
  'field.previous_rent': 'Aurreko kontratuaren errenta',
  'field.large_landlord': 'Edukitzaile handia',
  'field.unit_registration_code': 'Erregistro-kodea',
  'field.energy_certificate': 'Energia-ziurtagiria',

  'evidence.from': '{src}:',
  'source.title': 'Izenburuan',
  'source.description': 'Deskribapenean',
  'source.features': 'Fitxa teknikoan',
  'source.structured_data': 'Orriaren datuetan',
  'evidence.none': 'Datu hau ez da aurkitu iragarkian.',
  'energy.label': 'Energia-kalifikazioa {letter}',
  'method.model': 'Tokiko ereduaren arabera · konfiantza %{pct}',
  'warn.priceAbove': 'Prezioak iragarkian adierazitako muga gainditzen du.',
  'scope.vacationalNotice': 'Iragarki hau oporretako edo denboraldiko alokairu gisa aurkezten da. Benetan halakoa bada, arauaren esparrutik kanpo dago. Ohiko etxebizitza ezkutatua bada, iragarleak informatzeko betebeharra saihesten egon liteke. Analisia informazio gisa soilik.',

  'meta.url': 'URL',
  'meta.id': 'Iragarkiaren IDa',
  'meta.checkedAt': 'Azterketa-data',
  'meta.ruleset': 'Arauen bertsioa',
  'meta.sha256': 'SHA-256 aztarna',
  'meta.qr': 'Eskaneatu iragarkia irekitzeko',

  'actions.copyText': 'Fitxa kopiatu',
  'actions.copyJson': 'JSON kopiatu',
  'actions.exportPdf': 'PDF esportatu',
  'actions.reportError': 'Akatsa jakinarazi',
  'advanced.title': 'Aurreratua',
  'report.bodyIntro': 'Deskribatu akatsa (adibidez, iragarkian ageri den datu bat, edo eremu tentsionatu gisa oker sailkatutako udalerri bat):',
  'settings.language': 'Hizkuntza',
  'toast.pdfOpened': 'PDFa ireki da. Erabili «Gorde PDF gisa».',
  'toast.copied': '{what} arbelean kopiatu da.',
  'toast.copyError': 'Ezin izan da kopiatu.',
  'copy.ficha': 'Fitxa',
  'copy.fichaJson': 'JSON fitxa',

  'means.rent_reference_index': 'Erreferentziazko indizerik gabe ezin duzu jakin administrazioak etxebizitza honentzat zer prezio ezartzen duen.',
  'means.max_rent': 'Gehieneko errentarik gabe ezin duzu egiaztatu eskatutako prezioak legezko muga gainditzen duen eremu tentsionatuan.',
  'means.previous_rent': 'Aurreko kontratuaren errentak (azken 5 urteak) eska daitekeen prezioa baldintzatzen du.',
  'means.large_landlord': 'Errentatzailea edukitzaile handia den jakiteak aplikatzen zaizkion prezio-arauak aldatzen ditu.',
  'means.energy_certificate': 'Energia-ziurtagiria nahitaezkoa da iragarki guztietan. «Izapidetzen» esateak ez du letra ordezkatzen.',

  'disclaimer': 'Anuncio Claro-k informatu egiten du, ez du aholkularitza juridikorik ematen. Zein datu ez diren aurkitu adierazten du. Horiek sartzea iragarlearen ardura da.',
  'empty.noListing': 'Ireki alokairuko iragarki bat onartutako atari batean analisia ikusteko.',
  'empty.outOfScope': 'Iragarki hau denboraldiko oporretakoa edo salmentakoa dela dirudi, arauaren esparrutik kanpo. Ez da analizatzen.',
};

// Galego. Translations are best-effort and should get a native review.
const gl: Catalog = {
  'verdict.pass.head': 'O anuncio inclúe os datos obrigatorios',
  'verdict.warn.head': 'Hai dúbidas ou faltan datos complementarios',
  'verdict.fail.head': 'Faltan datos obrigatorios',
  'verdict.label.pass': 'CUMPRE',
  'verdict.label.warn': 'REVISAR',
  'verdict.label.fail': 'NON CUMPRE',

  'pill.pass': 'Cumpre',
  'pill.warn': 'Revisar',
  'pill.missing.one': 'Falta 1 dato obrigatorio',
  'pill.missing.many': 'Faltan {n} datos obrigatorios',

  'basics.price': 'Prezo',
  'basics.area': 'Superficie',
  'basics.municipality': 'Concello',
  'basics.stressed': 'Zona tensionada',
  'zone.yes': 'Si',
  'zone.no': 'Non',
  'zone.unknown': 'Descoñecida',
  'value.yes': 'Si',
  'value.no': 'Non',
  'unit.month': '€/mes',
  'unit.month_per_m2': '€/m²',
  'na': 'n/d',

  'checks.heading': 'Comprobacións',
  'status.present': 'Presente',
  'status.missing': 'Ausente',
  'status.uncertain': 'Dubidoso',
  'status.not_applicable': 'Non aplica',

  'field.rent_reference_index': 'Índice de referencia',
  'field.max_rent': 'Renda máxima aplicable',
  'field.rent_limit_basis': 'Normativa do límite',
  'field.previous_rent': 'Renda do contrato anterior',
  'field.large_landlord': 'Grande tenedor',
  'field.unit_registration_code': 'Código de rexistro',
  'field.energy_certificate': 'Certificado enerxético',

  'evidence.from': 'En {src}:',
  'source.title': 'o título',
  'source.description': 'a descrición',
  'source.features': 'a ficha técnica',
  'source.structured_data': 'os datos da páxina',
  'evidence.none': 'Non se atopou este dato no anuncio.',
  'energy.label': 'Cualificación enerxética {letter}',
  'method.model': 'Segundo modelo local · confianza {pct}%',
  'warn.priceAbove': 'O prezo supera o límite indicado no propio anuncio.',
  'scope.vacationalNotice': 'Este anuncio preséntase como vacacional ou de temporada. Se o é realmente, queda fóra do ámbito da norma. Se é vivenda habitual encuberta, o anunciante podería estar eludindo a obriga de informar. Análise a título informativo.',

  'meta.url': 'URL',
  'meta.id': 'ID do anuncio',
  'meta.checkedAt': 'Data de análise',
  'meta.ruleset': 'Versión de regras',
  'meta.sha256': 'Pegada SHA-256',
  'meta.qr': 'Escanea para abrir o anuncio',

  'actions.copyText': 'Copiar ficha',
  'actions.copyJson': 'Copiar JSON',
  'actions.exportPdf': 'Exportar PDF',
  'actions.reportError': 'Informar dun erro',
  'advanced.title': 'Avanzado',
  'report.bodyIntro': 'Describe o erro (por exemplo, un dato que si aparece no anuncio, ou un concello mal clasificado como zona tensionada):',
  'settings.language': 'Idioma',
  'toast.pdfOpened': 'Abriuse o PDF. Usa «Gardar como PDF».',
  'toast.copied': '{what} copiada ao portapapeis.',
  'toast.copyError': 'Non se puido copiar.',
  'copy.ficha': 'Ficha',
  'copy.fichaJson': 'Ficha JSON',

  'means.rent_reference_index': 'Sen o índice de referencia non podes saber que prezo marca a administración para esta vivenda.',
  'means.max_rent': 'Sen a renda máxima non podes comprobar se o prezo pedido supera o límite legal en zona tensionada.',
  'means.previous_rent': 'A renda do contrato anterior (últimos 5 anos) condiciona o prezo que che poden pedir.',
  'means.large_landlord': 'Saber se o arrendador é grande tenedor cambia as regras de prezo que se lle aplican.',
  'means.energy_certificate': 'O certificado enerxético é obrigatorio en todo anuncio. «En trámite» non substitúe a letra.',

  'disclaimer': 'Anuncio Claro informa, non asesora xuridicamente. Indica que datos non se atoparon no anuncio. A responsabilidade de incluílos é do anunciante.',
  'empty.noListing': 'Abre un anuncio de alugueiro nun portal compatible para ver a análise.',
  'empty.outOfScope': 'Este anuncio parece de temporada vacacional ou de venda, fóra do ámbito da norma. Non se analiza.',
};

const CATALOGS: Record<Locale, Catalog> = { es, en, ca, eu, gl };

/** Map the browser's preferred languages to a supported locale. */
export function resolveLocale(prefs: readonly string[] | undefined): Locale {
  for (const p of prefs ?? []) {
    const base = p.toLowerCase().split('-')[0];
    if (base && (SUPPORTED_LOCALES as readonly string[]).includes(base)) return base as Locale;
    // Unsupported languages -> keep looking, then default.
  }
  return DEFAULT_LOCALE;
}

function interpolate(tpl: string, params?: Record<string, string | number>): string {
  if (!params) return tpl;
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => String(params[k] ?? `{${k}}`));
}

/** Translate `key` for `locale`, falling back to Spanish then the key. */
export function t(locale: Locale, key: string, params?: Record<string, string | number>): string {
  const str = CATALOGS[locale][key] ?? CATALOGS[DEFAULT_LOCALE][key] ?? key;
  return interpolate(str, params);
}

/** Detect the viewer's locale from the browser (used in panel and content). */
export function detectLocale(): Locale {
  const prefs =
    typeof navigator !== 'undefined'
      ? (navigator.languages ?? (navigator.language ? [navigator.language] : []))
      : [];
  return resolveLocale(prefs);
}

// --- Stored language preference --------------------------------------------
// The user can override the auto-detected language from the panel. 'auto' keeps
// following the browser. Persisted in chrome.storage.local, shared panel+content.

export type LocalePref = Locale | 'auto';
const PREF_KEY = 'localePref';

function isLocalePref(v: unknown): v is LocalePref {
  return v === 'auto' || (typeof v === 'string' && (SUPPORTED_LOCALES as readonly string[]).includes(v));
}

export async function loadLocalePref(): Promise<LocalePref> {
  try {
    const data = await chrome.storage.local.get(PREF_KEY);
    const v = data[PREF_KEY];
    return isLocalePref(v) ? v : 'auto';
  } catch {
    return 'auto';
  }
}

export async function saveLocalePref(pref: LocalePref): Promise<void> {
  try {
    await chrome.storage.local.set({ [PREF_KEY]: pref });
  } catch {
    /* storage unavailable (e.g. tests) */
  }
}

export const PREF_STORAGE_KEY = PREF_KEY;

/** Resolve a preference to a concrete locale ('auto' -> browser detection). */
export function activeLocale(pref: LocalePref): Locale {
  return pref === 'auto' ? detectLocale() : pref;
}
