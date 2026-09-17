import { SampleRecordingPreset } from '../types';

export const PHARMACY_SAMPLE_PRESETS: SampleRecordingPreset[] = [
  {
    id: 'sample_sale_1',
    title: 'Kardiomaqnil & Spasmalqon Satışı (Kartla)',
    subtitle: 'Kardiologiya və Ağrıkəsici dərmanlar',
    category: 'sale_success',
    badge: 'Satış baş tutdu (8.40 AZN)',
    expectedOutcome: 'Sale',
    description: 'Müştəri qan durulaşdırıcı Kardiomaqnil və Spasmalqon ağrıkəsici alır. Əczaçı qiyməti hesablayır və ödəniş POS terminal vasitəsilə təsdiqlənir.',
    dialoguePreview: 'Salam əleykum, qızım. Mənə Kardiomaqnil 75 milliqram lazımdır, bir də Spasmalqon tabletka var sizdə?...',
    dialogueScript: [
      {
        speaker: 'customer',
        text: 'Salam əleykum, qızım. Mənə Kardiomaqnil 75 milliqram lazımdır, bir də Spasmalqon tabletka var sizdə?',
      },
      {
        speaker: 'pharmacist',
        text: 'Salam, bəli, hər ikisi var. Kardiomaqnil 75 mq 28 tabletka 4 manat 80 qəpikdir, Spasmalqon da 20 tabletka 3 manat 60 qəpik. Cəmi 8 manat 40 qəpik edir.',
      },
      {
        speaker: 'customer',
        text: 'Çox gözəl, bükün zəhmət olmasa. Kartla vura bilərəm? Təmassız keçir?',
      },
      {
        speaker: 'pharmacist',
        text: 'Bəli, əlbəttə, terminala yaxınlaşdırın. Buyurun qəbziniz və dərmanlarınız. Kardiomaqnili axşam yeməkdən sonra için. Sağlam olun!',
      },
      {
        speaker: 'customer',
        text: 'Çox sağ olun, təşəkkür edirəm, xeyirli işlər.',
      },
    ],
  },
  {
    id: 'sample_nosale_antibiotic',
    title: 'Sumamed (Azitromisin) Resept Tələbi',
    subtitle: 'Antibiotik və Resept Qadağası',
    category: 'sale_failed',
    badge: 'Satış baş tutmadı (Resept yoxdur)',
    expectedOutcome: 'No Sale',
    description: 'Müştəri qrip əlamətləri üçün güclü antibiotik (Sumamed 500mq) almaq istəyir. Əczaçı reseptsiz verməkdən imtina edir, müştəri alternativlərdən imtina edib gedir.',
    dialoguePreview: 'Здравствуйте! У вас есть Сумамед 500 миллиграмм, Азитромицин?... Yox, reseptsizəm...',
    dialogueScript: [
      {
        speaker: 'customer',
        text: 'Здравствуйте! У вас есть Сумамед 500 миллиграмм, Азитромицин капсулы?',
      },
      {
        speaker: 'pharmacist',
        text: 'Здравствуйте. Bəli, Сумамед 500 мг var, amma o ciddi antibiotikdir və qanunla reseptlədir. Həkim reseptiniz var yanınızda?',
      },
      {
        speaker: 'customer',
        text: 'Yox, reseptsizəm, просто горло болит и температура, elə-belə içmək istəyirdim tez sağalım.',
      },
      {
        speaker: 'pharmacist',
        text: 'Xeyr, təəssüf ki reseptsiz antibiotik verə bilmərik, həm də virus infeksiyasında antibiotik kömək etmir. İstəsəniz boğaz üçün Qrammidin sormaq üçün tablet və qızdırma üçün Parasetamol verə bilərəm.',
      },
      {
        speaker: 'customer',
        text: 'Yox, sağ olun, qiyməti də baha idi, mən o vaxt poliklinikaya həkimə müraciət edərəm. До свидания.',
      },
    ],
  },
  {
    id: 'sample_sale_pediatric',
    title: 'Nurofen Sirob & Lineks Forte (Nağd)',
    subtitle: 'Pediatrik və Probiotik dərmanlar',
    category: 'sale_success',
    badge: 'Satış baş tutdu (20.20 AZN)',
    expectedOutcome: 'Sale',
    description: 'Valideyn uşaq üçün Nurofen çiyələkli sirobu və Lineks bağırsaq probiotiki alır. Nağd pulla 50 AZN verilir və 29.80 AZN qalıq qaytarılır.',
    dialoguePreview: 'Salam. Uşaq üçün Nurofen sirobu var? Çiyələkli olandan... Bir dənə də Lineks forte kapsul verin...',
    dialogueScript: [
      {
        speaker: 'customer',
        text: 'Salam. Uşaq üçün Nurofen sirobu var? Çiyələkli olandan 100 milliqram.',
      },
      {
        speaker: 'pharmacist',
        text: 'Bəli, var, 6 manat 20 qəpikdir. Uşağın neçə yaşı var? Qızdırması nə qədərdir?',
      },
      {
        speaker: 'customer',
        text: '4 yaşı var, 38.5 dərəcədir. Bir dənə də Lineks forte kapsul verin zəhmət olmasa, qarnı da ağrıyır.',
      },
      {
        speaker: 'pharmacist',
        text: 'Oldu. Nurofen 6.20, Lineks forte 14 manat. Cəmi 20 manat 20 qəpik edir. Nağd yoxsa kart?',
      },
      {
        speaker: 'customer',
        text: 'Nağd verəcəm, buyurun 50 manat, zəhmət olmasa qalığı qaytararsınız.',
      },
      {
        speaker: 'pharmacist',
        text: 'Buyurun, 29 manat 80 qəpik qalığınız və kassa çekiniz. Nurofeni şprislə 5 ml verin, 6 saatdan tez təkrarlamayın.',
      },
      {
        speaker: 'customer',
        text: 'Çox sağ olun, təşəkkürlər.',
      },
    ],
  },
  {
    id: 'sample_nosale_stock',
    title: 'Tebokan Forte 120 mq (Qalıqda yoxdur)',
    subtitle: 'Nootrop / Beyin qan dövranı',
    category: 'sale_failed',
    badge: 'Satış baş tutmadı (Defisit)',
    expectedOutcome: 'No Sale',
    description: 'Müştəri Tebokan 120mq tələb edir, lakin anbarlarda tükənib. Əczaçı Tanakan və ya Bilobil analoqunu təklif edir, lakin müştəri sırf bu brendi axtardığı üçün başqa aptekə gedir.',
    dialoguePreview: 'Salam. Sizdə Tebokan forte 120 milliqram var?... Xeyr, təəssüf ki anbarda da qurtarıb...',
    dialogueScript: [
      {
        speaker: 'customer',
        text: 'Salam. Sizdə Tebokan forte 120 milliqram tabletka var? Həkim nənəm üçün yazıb.',
      },
      {
        speaker: 'pharmacist',
        text: 'Salam. Yoxlayım bazadan... Xeyr, təəssüf ki Tebokan hal-hazırda depolarda da bitib, defisitdədir. Amma eyni tərkib Ginkgo Biloba ekstraktı olan Tanakan və ya Bilobil 120 mq var.',
      },
      {
        speaker: 'customer',
        text: 'Yox, həkim tapşırıb ki ancaq Tebokan alın. Analoq götürməyə cürət etmirəm, bəlkə başqa filialınızda olar?',
      },
      {
        speaker: 'pharmacist',
        text: 'Mərkəzi filialda da bitib. Amma istəsəniz sabah depodan soruşa bilərəm.',
      },
      {
        speaker: 'customer',
        text: 'Yox, tələsirik, yaxınlıqdakı digər apteklərə baş çəkərik. Çox sağ olun məlumat üçün.',
      },
    ],
  },
];
