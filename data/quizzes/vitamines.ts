export type QType = 'QCU' | 'QCM' | 'VF';
export type Question = {
  id: number;
  type: QType;
  prompt: string;
  choices: string[];
  correct: string | Set<string>;
};

export const VITAMIN_QUESTIONS: Question[] = [
  { id: 1, type: 'QCM', prompt: 'Quelles vitamines sont liposolubles ? (sélectionne toutes les bonnes réponses)', choices: ['Vitamine A','Vitamine B9','Vitamine C','Vitamine D','Vitamine E','Vitamine K'], correct: new Set(['Vitamine A','Vitamine D','Vitamine E','Vitamine K']) },
  { id: 2, type: 'QCU', prompt: 'Laquelle est majoritairement synthétisée via l’exposition au soleil ?', choices: ['Vitamine A','Vitamine C','Vitamine K','Vitamine D'], correct: 'Vitamine D' },
  { id: 3, type: 'QCU', prompt: 'Quelle carence est associée à la cécité nocturne (héméralopie) ?', choices: ['Vitamine A','Vitamine B12','Vitamine C','Vitamine E'], correct: 'Vitamine A' },
  { id: 4, type: 'QCU', prompt: 'Quelles sont les vitamines hydrosolubles ?', choices: ['A, D, E, K','B-complexe et C','A et C','D et K'], correct: 'B-complexe et C' },
  { id: 5, type: 'QCU', prompt: 'Quel énoncé est le plus exact ?', choices: ['Les vitamines apportent des calories','Les hydrosolubles s’accumulent facilement','Les liposolubles présentent plus de risque de toxicité à forte dose','La vitamine C diminue l’absorption du fer non héminique'], correct: 'Les liposolubles présentent plus de risque de toxicité à forte dose' },
  { id: 6, type: 'QCM', prompt: 'Client·e végan + faible exposition au soleil en hiver : surveiller en priorité…', choices: ['Vitamine B12','Vitamine D','Vitamine A','Vitamine K'], correct: new Set(['Vitamine B12','Vitamine D']) },
  { id: 7, type: 'QCU', prompt: 'La vitamine C…', choices: ['Diminue l’absorption du fer','Soutient la synthèse du collagène et l’absorption du fer non héminique','Est liposoluble','Provoque systématiquement des troubles digestifs à 200 mg'], correct: 'Soutient la synthèse du collagène et l’absorption du fer non héminique' },
  { id: 8, type: 'VF',  prompt: 'Vrai ou Faux : Une alimentation équilibrée rend toute supplémentation vitaminique inutile chez tous les adultes.', choices: ['Vrai','Faux'], correct: 'Faux' },
  { id: 9, type: 'QCU', prompt: 'Dans quel cas faut-il être particulièrement prudent avec la vitamine A ?', choices: ['Sujet migraineux','Grossesse','Athlète d’endurance','Personne âgée'], correct: 'Grossesse' },
  { id: 10, type: 'QCU', prompt: 'Quelle association est correcte ?', choices: ['Vitamine K → coagulation','Vitamine E → synthèse de la mélanine','Vitamine D → coagulation','Vitamine B12 → antioxydant majeur'], correct: 'Vitamine K → coagulation' },
];
