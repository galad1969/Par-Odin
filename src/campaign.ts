import type { WhiteFace } from './rules.ts';

export type ChapterId = 'brokk' | 'loki' | 'frigg';

export interface ChapterInfo {
  id: ChapterId;
  name: string;
  subtitle: string;
  accent: string;
  intro: string;
}

export interface CampaignChallenge {
  id: number;
  chapter: ChapterId;
  whiteFaces: WhiteFace[];
  hasFenrir: boolean;
  ruleTip?: string;
  quote: string;
  author: string;
}

export const CHAPTERS: Record<ChapterId, ChapterInfo> = {
  brokk: {
    id: 'brokk',
    name: 'Brokk le Nain',
    subtitle: "Tavernier de l'Auberge des Dieux",
    accent: '#4aa8c2',
    intro:
      'Bienvenue au Valhalla ! Répartis tes 7 guerriers en deux armées de force strictement identique pour apprivoiser les 6 faces blanches.',
  },
  loki: {
    id: 'loki',
    name: 'Loki',
    subtitle: "Dieu de la Tromperie et de l'Esprit Malin",
    accent: '#4cc45a',
    intro:
      'Voici 10 défis plus fourbes : combine Traîtres, Maudits et Mages multiples sans tomber dans mes pièges !',
  },
  frigg: {
    id: 'frigg',
    name: 'Frigg',
    subtitle: "Déesse de l'Amour et de la Fertilité",
    accent: '#e5b842',
    intro:
      'Découvre la puissance des faces noires avec le Loup Fenrir : il double la plus forte face blanche de son armée après calcul des guerriers.',
  },
};

export const CAMPAIGN_CHALLENGES: readonly CampaignChallenge[] = [
  {
    id: 1,
    chapter: 'brokk',
    whiteFaces: ['heros', 'heros', 'heros', 'capitaine', 'soldat', 'soldat', 'soldat'],
    hasFenrir: false,
    ruleTip: 'Héros = 3, Capitaine = 2, Soldat = 1. Répartis les 7 dés en deux armées égales.',
    quote:
      "Au commencement de tout est l'arbre sacré Yggdrasil et, chaque jour, à son ombre, l'aigle et le serpent se livrent un éternel combat, répétant ainsi cette vérité primordiale du nord : ce qui vit, c'est ce qui lutte.",
    author: 'Skald, barde et poète du pays du nord',
  },
  {
    id: 2,
    chapter: 'brokk',
    whiteFaces: ['heros', 'heros', 'capitaine', 'capitaine', 'capitaine', 'capitaine', 'traitre'],
    hasFenrir: false,
    ruleTip: "Nouveau — Le Traître (1) réduit à 0 la force d'un seul Héros présent dans son armée.",
    quote:
      "— Dans quel camp es-tu donc, traître ? — C'est très simple, je suis dans le camp du plus fort...",
    author: 'Extrait de la bataille de Hjadningar',
  },
  {
    id: 3,
    chapter: 'brokk',
    whiteFaces: ['heros', 'heros', 'heros', 'capitaine', 'capitaine', 'capitaine', 'maudit'],
    hasFenrir: false,
    ruleTip: "Nouveau — Le Maudit (anneau d'Andvari) possède une force négative de -1.",
    quote:
      "Jamais les dieux n'auraient dû voler l'anneau d'or d'Andvari... Car ce dernier, pris d'une colère folle, maudit l'anneau de telle façon qu'il apporta destruction et malheur à tous ceux qui le possédèrent.",
    author: 'Extrait de la légende de Reginsmal',
  },
  {
    id: 4,
    chapter: 'brokk',
    whiteFaces: ['heros', 'heros', 'heros', 'heros', 'soldat', 'traitre', 'maudit'],
    hasFenrir: false,
    quote:
      "Les dieux ont toujours aimé l'or, c'est peut-être un de leurs plus grands défauts. Mais comment empêcher les plus brillants d'aimer ce qui brille ?",
    author: 'Austri, grand chef nain dit « l’Oriental »',
  },
  {
    id: 5,
    chapter: 'brokk',
    whiteFaces: ['soldat', 'soldat', 'soldat', 'soldat', 'soldat', 'soldat', 'mage'],
    hasFenrir: false,
    ruleTip:
      'Nouveau — Le Mage (?) a une force égale au nombre de faces blanches non-mages de son armée.',
    quote:
      'On raconte que le premier mage était un dieu déchu qui, descendu parmi les hommes, fit régner la terreur et le chaos.',
    author: 'Skald, barde et poète du pays du nord',
  },
  {
    id: 6,
    chapter: 'loki',
    whiteFaces: ['heros', 'heros', 'capitaine', 'soldat', 'soldat', 'soldat', 'mage'],
    hasFenrir: false,
    quote:
      "Si tu vois un mage : ne cours pas, il te rattraperait. Ne crie pas, il te ferait taire. Ne te bats pas, il te tuerait. Prie, c'est tout ce qu'il te reste à faire...",
    author: 'Helgi Hjörvarðsson, Héros humain',
  },
  {
    id: 7,
    chapter: 'loki',
    whiteFaces: ['heros', 'heros', 'capitaine', 'soldat', 'soldat', 'maudit', 'mage'],
    hasFenrir: false,
    quote:
      'Le pouvoir des mages réside très certainement dans la connaissance des runes. Écriture sacrée, celui qui les déchiffre acquiert la puissance et le souffle du père de tout.',
    author: 'Aslak, barde et poète du pays du nord',
  },
  {
    id: 8,
    chapter: 'loki',
    whiteFaces: ['heros', 'capitaine', 'capitaine', 'capitaine', 'maudit', 'maudit', 'mage'],
    hasFenrir: false,
    quote:
      "Et toi, retiens ce conseil : va-t'en d'ici ! L'or sonore, l'argent rouge comme braise et les anneaux ne te mèneront qu'à la mort.",
    author: 'Fafnir le dragon, extrait de la légende de Siegfried',
  },
  {
    id: 9,
    chapter: 'loki',
    whiteFaces: ['heros', 'heros', 'capitaine', 'capitaine', 'soldat', 'traitre', 'mage'],
    hasFenrir: false,
    ruleTip:
      "Rappel — Même si un Héros a 0 de force à cause d'un Traître, il compte toujours comme face non-mage pour le Mage.",
    quote: 'Quand un traître et un mage sont dans la même bataille, cela donne des étincelles !',
    author: 'Loki, dieu de la tromperie',
  },
  {
    id: 10,
    chapter: 'loki',
    whiteFaces: ['heros', 'heros', 'capitaine', 'traitre', 'traitre', 'traitre', 'mage'],
    hasFenrir: false,
    quote:
      "Si un traître trahit un autre traître, est-ce qu'il ne devient pas en quelque sorte un honnête homme ?",
    author: 'Ndjal dit le brûlé, lors de la bataille de Vigrid',
  },
  {
    id: 11,
    chapter: 'loki',
    whiteFaces: ['heros', 'heros', 'capitaine', 'capitaine', 'traitre', 'maudit', 'mage'],
    hasFenrir: false,
    quote:
      "L'histoire des hommes est faite de trahisons. Trahison d'amour, trahison d'argent, trahison de famille... Mais parmi toutes ces trahisons, la trahison de guerre reste la plus fréquente. Est-elle la plus odieuse ?",
    author: 'Lird, prophète du grand nord',
  },
  {
    id: 12,
    chapter: 'loki',
    whiteFaces: ['heros', 'heros', 'soldat', 'soldat', 'traitre', 'mage', 'mage'],
    hasFenrir: false,
    ruleTip:
      "Rappel — Avec plusieurs Mages dans la même armée, la force de chaque Mage vaut le nombre de faces blanches non-mages de cette armée.",
    quote: "Il n'y a rien de pire qu'un mage, à part peut-être... Deux mages.",
    author: 'Hrym le géant, pendant la bataille de Ragnarök',
  },
  {
    id: 13,
    chapter: 'loki',
    whiteFaces: ['soldat', 'maudit', 'maudit', 'mage', 'mage', 'mage', 'mage'],
    hasFenrir: false,
    quote:
      "Chaque année, les mages se réunissent dans un lieu secret. Est-ce aux limites de Midgard ou au Nidavellir ? Nul ne le sait. Et à mon avis, il est fort préférable de ne pas le savoir...",
    author: 'Barde nordique anonyme',
  },
  {
    id: 14,
    chapter: 'loki',
    whiteFaces: ['heros', 'capitaine', 'capitaine', 'maudit', 'mage', 'mage', 'mage'],
    hasFenrir: false,
    quote:
      "Certaines batailles apparaissent comme impossibles, irréelles. Est-ce un rêve ? Un cauchemar ? Ou est-ce simplement le signe que le temps nous est déjà compté ?",
    author: 'Jarl, Héros du grand nord',
  },
  {
    id: 15,
    chapter: 'loki',
    whiteFaces: ['heros', 'soldat', 'traitre', 'traitre', 'mage', 'mage', 'mage'],
    hasFenrir: false,
    quote:
      "En fin de compte, on va peut-être pouvoir faire quelque chose de toi ! Va voir Frigg de ma part...",
    author: 'Loki, dieu de la tromperie',
  },
  {
    id: 16,
    chapter: 'frigg',
    whiteFaces: ['heros', 'heros', 'heros', 'capitaine', 'soldat', 'soldat', 'mage'],
    hasFenrir: true,
    ruleTip:
      'Nouveau — Le Loup Fenrir (dé noir) agit après les dés blancs et double la force de la plus forte face blanche de son armée (ne compte pas pour le Mage).',
    quote:
      "Fenrir n'est pas un simple loup, c'est le fils de Loki, le plus fourbe des dieux, et de la géante Angrboda, celle qui apporte le chagrin. À union maudite, fils maudit...",
    author: 'Hagbard, roi des mers scandinaves',
  },
  {
    id: 17,
    chapter: 'frigg',
    whiteFaces: ['heros', 'capitaine', 'capitaine', 'capitaine', 'soldat', 'traitre', 'mage'],
    hasFenrir: true,
    quote:
      "Le loup Fenrir marchera la gueule béante, la mâchoire inférieure rasant la terre et la mâchoire supérieure touchant le ciel. Et il l'ouvrirait davantage encore s'il y avait la place.",
    author: 'Gylfaginning, chapitre 51',
  },
  {
    id: 18,
    chapter: 'frigg',
    whiteFaces: ['heros', 'soldat', 'soldat', 'soldat', 'traitre', 'mage', 'mage'],
    hasFenrir: true,
    quote:
      "Si Tyr, dieu de la guerre, est un dieu manchot, c'est car sa main est pour toujours dans la gueule de Fenrir. Tel était le prix à payer pour que Fenrir soit enchaîné.",
    author: 'Barde nordique anonyme',
  },
];
