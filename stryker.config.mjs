/* Testes de mutação (Stryker): altera o código das regras (inverte condições, troca operadores...) e confere se
   algum teste falha. Mutante que sobrevive = caso que os testes não cobrem. Rodar: npm run test:mutation */
export default {
  testRunner: 'vitest',
  mutate: [
    'src/lib/picks.ts', 'src/lib/picks-ranking.ts', 'src/lib/fights.ts', 'src/lib/style.ts', 'src/lib/fanscore.ts', 'src/lib/stories.ts',
    'server/elo.ts', 'server/wiki.ts',
  ],
  reporters: ['clear-text', 'progress', 'html'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  coverageAnalysis: 'perTest',
  thresholds: { high: 85, low: 70, break: 50 },
  tempDirName: '.stryker-tmp',
};
